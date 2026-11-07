'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-payapp-methods.user.js'),'utf8');
const ctor=()=>({display:'block',visibility:'visible'});
function setup(url='https://payapp.kr/WEBPAY_INPUT/demo',opts={}){
 const u=new URL(url),buttons=[],storage=opts.sharedStorage||new Map(),gmStorage=opts.sharedGMStorage||new Map(),nodes=[],timers=[],observers=[];
 if(opts.autoOn)storage.set('bbp_payapp_auto_route_v1','on');
 function el(tag){
  const item={
   tagName:tag.toUpperCase(),children:[],parentElement:null,hidden:false,isConnected:true,
   listeners:{},style:{},id:'',type:'',textContent:'',attrs:{},value:'',
   appendChild(child){child.parentElement=this;this.children.push(child);return child;},
   append(...children){for(const c of children)this.appendChild(c);},
   setAttribute(k,v){this.attrs[k]=v;},
   getAttribute(k){return this.attrs[k]??null;},
   attachShadow(){this.shadow=el('shadow');return this.shadow;},
   addEventListener(name,fn){this.listeners[name]=fn;},
   matches(q){return q.split(',').some(x=>x==='button'&&this.tagName==='BUTTON'||x==='a'&&this.tagName==='A');},
   closest(q){if(q==='#bbpPayappMethodHelper')return null;return null;},
   contains(){return false;},
   getClientRects(){return [1];},
   click(){this.clicked=(this.clicked||0)+1;if(this.onClick)this.onClick();}
  };
  nodes.push(item);
  return item;
 }
 const body=el('body');
 const docEvents={},winEvents={};
 const document={
  body,documentElement:body,createElement:el,hidden:false,
  querySelectorAll:()=>buttons,
  getElementById:(id)=>id==='CardNo1'&&opts.hasCardField?{}:null,
  addEventListener:(name,fn)=>{docEvents[name]=fn;}
 };
 const window={};window.top=window;window.self=window;
 window.addEventListener=(name,fn)=>{winEvents[name]=fn;};
 class MutationObserver{
  constructor(fn){this.fn=fn;observers.push(this);}
  observe(){}
 }
 const setTimeout=fn=>{timers.push(fn);return timers.length;};
 const clearTimeout=()=>{};
 function runTimers(){let attempts=0;while(timers.length){if(++attempts>10)throw Error('unbounded timer scheduling');timers.shift()();}}
 const mutate=()=>{for(const obs of observers)obs.fn();};
 const context={
  location:{hostname:u.hostname,protocol:u.protocol,pathname:u.pathname},
  document,window,getComputedStyle:ctor,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  GM_getValue:(k,fallback)=>gmStorage.has(k)?gmStorage.get(k):fallback,
  GM_setValue:(k,v)=>gmStorage.set(k,v),
  setTimeout,clearTimeout,MutationObserver,
 };
 vm.runInNewContext(source,context);
 const launcher=nodes.find(x=>x.id==='launcher'),panel=nodes.find(x=>x.id==='panel');
 const select=nodes.find(x=>x.tagName==='SELECT');
 const go=nodes.find(x=>x.id==='go'),status=nodes.find(x=>x.id==='status');
 function label(text,tag='div'){const x=el(tag);x.textContent=text;buttons.push(x);return x;}
 const autoToggle=nodes.find(x=>x.type==='checkbox');
 return {launcher,panel,select,go,status,storage,gmStorage,label,buttons,nodes,autoToggle,runTimers,mutate,document};
}
test('checkout helper launcher is visible away from a right-side floating overlay',()=>{
 assert.match(source,/position:fixed;left:10px;top:68px/);
 assert.match(source,/z-index:2147483646/);
 assert.doesNotMatch(source,/position:fixed;right:8px;top:10px/);
});
test('userscript is parsed and narrowly restricted to official PAYAPP checkout',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(source,/\/\/ @match\s+https:\/\/payapp\.kr\/WEBPAY_INPUT\/\*/);
 assert.ok(source.includes('// @match        https://www.payapp.kr/WEBPAY_INPUT/*'));
 assert.ok(source.includes('// @match        https://www.payapp.kr/WEBPAY_SCKA1/*'));
 assert.ok(source.includes('// @match        https://www.payapp.kr/homepage/*'));
 for(const url of ['https://payapp.kr/other','http://payapp.kr/WEBPAY_INPUT/abc','https://notpayapp.kr/WEBPAY_INPUT/abc'])
  assert.equal(setup(url).launcher,undefined);
 assert.ok(setup().launcher);
});
test('direct credit-card manual-entry is default and no navigations happen without a tap',()=>{
 const x=setup();
 assert.equal(x.select.value,'card');
 const title=x.label('결제방식 선택'),card=x.label('신용/체크 카드');
 assert.equal(card.clicked,undefined);
 x.launcher.listeners.click();
 x.go.listeners.click();
 assert.equal(card.clicked,1);
 assert.equal(x.storage.size,0,'default choice needs no persistent card data');
 assert.match(x.status.textContent,/결제 완료는 아니야/);
 x.go.listeners.click();
 assert.equal(card.clicked,1,'never double-click same stage');
});
test('manual card entry is selected on second stage, without touching the payment button',()=>{
 const x=setup();
 const stage=x.label('결제카드 선택'),menu=x.label('카드번호 및 유효기간 입력');
 const pay=x.label('결제','button');
 x.go.listeners.click();
 assert.equal(menu.clicked,1);
 assert.equal(pay.clicked,undefined);
 x.go.listeners.click();assert.equal(menu.clicked,1);
});
test('alternative payment preference remains switchable and persists mode only',()=>{
 const x=setup();
 x.label('결제방식 선택');
 const n=x.label('N pay'),k=x.label('카카오페이');
 x.select.value='naver';x.select.listeners.change();
 assert.equal(x.storage.get('bbp_payapp_method_v1'),'naver');
 x.go.listeners.click();assert.equal(n.clicked,1);assert.equal(k.clicked,undefined);
 x.select.value='kakao';x.select.listeners.change();
 x.go.listeners.click();assert.equal(k.clicked,1);
 assert.equal(x.storage.get('bbp_payapp_method_v1'),'kakao');
});
test('does not auto-check terms, enter sensitive payment fields, or approve payment',()=>{
 const x=setup();
 const terms=x.label('전체동의'),next=x.label('다음'),pay=x.label('결제','button');
 x.go.listeners.click();
 assert.equal(terms.clicked,undefined);assert.equal(next.clicked,undefined);assert.equal(pay.clicked,undefined);
 // If card fields are present, the "navigate" button must still do nothing.
 x.buttons.length=0;
 x.label('카드번호');x.label('유효기간');const finish=x.label('결제','button');
 x.go.listeners.click();
 assert.equal(finish.clicked,undefined);
 assert.match(x.status.textContent,/자동으로 진행하지 않아/);
 assert.equal(source.includes('XMLHttpRequest'),false);
 assert.doesNotMatch(source,/\.value\s*=\s*.*(?:CardNo|CVC|PIN|비밀번호)/i,'never autofill sensitive card data');
});
test('ambiguous matching labels fail closed and do not click anything',()=>{
 const x=setup();
 x.label('결제방식 선택');
 const c1=x.label('신용/체크 카드'),c2=x.label('신용/체크 카드');
 x.go.listeners.click();
 assert.equal(c1.clicked,undefined);
 assert.equal(c2.clicked,undefined);
 assert.match(x.status.textContent,/정확히 하나만 찾지 못했어/);
});

test('automation is opt-in and does not navigate payment methods until enabled once',()=>{
 const x=setup();
 const method=x.label('결제방식 선택'),card=x.label('신용/체크 카드');
 x.runTimers();x.mutate();x.runTimers();
 assert.equal(card.clicked,undefined);
 assert.equal(x.autoToggle.checked,false);
 x.autoToggle.checked=true;x.autoToggle.listeners.change();
 assert.equal(x.storage.get('bbp_payapp_auto_route_v1'),'on');
 x.runTimers();
 assert.equal(card.clicked,1);
 assert.equal(x.panel.hidden,true,'never requires the helper panel to open');
 x.mutate();x.runTimers();
 assert.equal(card.clicked,1,'no repeated click in unchanged stage');
 x.autoToggle.checked=false;x.autoToggle.listeners.change();
 assert.equal(x.storage.get('bbp_payapp_auto_route_v1'),'off');
});
test('opted-in Firefox payment chooser auto-selects default card route across two SPA stages',()=>{
 const x=setup('https://payapp.kr/WEBPAY_INPUT/demo',{autoOn:true});
 assert.equal(x.autoToggle.checked,true);
 x.label('결제방식 선택');
 const method=x.label('신용/체크 카드');
 x.runTimers();
 assert.equal(method.clicked,1);
 x.buttons.length=0;
 x.label('결제카드 선택');
 const manualCard=x.label('카드번호 및 유효기간 입력');
 x.mutate();x.runTimers();
 assert.equal(manualCard.clicked,1);
 x.mutate();x.runTimers();
 assert.equal(manualCard.clicked,1);
 x.buttons.length=0;
 x.label('카드번호');x.label('유효기간');
 const pay=x.label('결제','button');
 x.mutate();x.runTimers();
 assert.equal(pay.clicked,undefined,'payment never gets approved');
});
test('auto-selection skips terms, hidden tabs, unknown and ambiguous checkout screens',()=>{
 const x=setup('https://payapp.kr/WEBPAY_INPUT/demo',{autoOn:true});
 const terms=x.label('전체동의'),next=x.label('다음');
 x.runTimers();
 assert.equal(terms.clicked,undefined);assert.equal(next.clicked,undefined);
 x.buttons.length=0;
 x.label('결제방식 선택');
 const a=x.label('신용/체크 카드'),b=x.label('신용/체크 카드');
 x.mutate();x.runTimers();
 assert.equal(a.clicked,undefined);assert.equal(b.clicked,undefined);
 x.buttons.length=0;
 x.label('결제방식 선택');
 const card=x.label('신용/체크 카드');
 x.document.hidden=true;x.mutate();x.runTimers();
 assert.equal(card.clicked,undefined);
 x.document.hidden=false;x.mutate();x.runTimers();
 assert.equal(card.clicked,1);
});

test('official PAYAPP homepage shows a preset UI before any order is created',()=>{
 const x=setup('https://payapp.kr/homepage/index.html');
 const save=x.nodes.find(n=>n.id==='bbpPresetSave');
 const method=x.nodes.find(n=>n.id==='bbpPresetMethod');
 const check=x.nodes.find(n=>n.id==='bbpPresetAuto');
 assert.ok(save);assert.ok(method);assert.ok(check);
 assert.equal(method.value,'card');
 assert.equal(check.checked,false);
 assert.equal(x.launcher,undefined,'checkout helper must not appear on marketing site');
 assert.equal(x.storage.size,0,'opening settings should not write preferences');
 method.value='card';
 check.checked=true;
 save.listeners.click();
 assert.equal(x.storage.get('bbp_payapp_method_v1'),'card');
 assert.equal(x.storage.get('bbp_payapp_auto_route_v1'),'on');
 const status=x.nodes.find(n=>n.id==='bbpPresetStatus');
 assert.match(status.textContent,/저장 완료/);
});
test('saved homepage preferences are picked up in the same-origin checkout without opening helper',()=>{
 const sharedStorage=new Map();
 const setupPage=setup('https://payapp.kr/homepage/index.html',{sharedStorage});
 setupPage.nodes.find(n=>n.id==='bbpPresetAuto').checked=true;
 setupPage.nodes.find(n=>n.id==='bbpPresetSave').listeners.click();
 const checkout=setup('https://payapp.kr/WEBPAY_INPUT/example',{sharedStorage});
 assert.equal(checkout.autoToggle.checked,true);
 assert.equal(checkout.select.value,'card');
 checkout.label('결제방식 선택');
 const cardTile=checkout.label('신용/체크 카드');
 checkout.runTimers();
 assert.equal(cardTile.clicked,1);
 assert.equal(checkout.panel.hidden,true);
});
test('PAYAPP homepage pref may be changed to another provider or turned off before order',()=>{
 const storage=new Map();
 const x=setup('https://payapp.kr/homepage/index.html',{sharedStorage:storage});
 const method=x.nodes.find(n=>n.id==='bbpPresetMethod');
 const toggle=x.nodes.find(n=>n.id==='bbpPresetAuto');
 const save=x.nodes.find(n=>n.id==='bbpPresetSave');
 method.value='kakao';toggle.checked=true;save.listeners.click();
 assert.equal(storage.get('bbp_payapp_method_v1'),'kakao');
 const checkout=setup('https://payapp.kr/WEBPAY_INPUT/test',{sharedStorage:storage});
 checkout.label('결제방식 선택');
 const kakaoTile=checkout.label('카카오페이');
 checkout.runTimers();assert.equal(kakaoTile.clicked,1);
 toggle.checked=false;save.listeners.click();
 const later=setup('https://payapp.kr/WEBPAY_INPUT/test2',{sharedStorage:storage});
 later.label('결제방식 선택');
 const tile=later.label('카카오페이');later.runTimers();
 assert.equal(tile.clicked,undefined,'auto OFF must never navigate');
});
test('PAYAPP homepage preset neither asks for, reads, nor submits credit-card data',()=>{
 const x=setup('https://payapp.kr/homepage/index.html');
 assert.equal(x.buttons.length,0);
 assert.equal(x.nodes.some(n=>n.type==='password'||n.type==='number'),false);
 assert.equal(source.includes('XMLHttpRequest'),false);
});

test('mobile PAYAPP preset has a clear accessible ON/OFF button when the merchant hides checkboxes',()=>{
 const x=setup('https://payapp.kr/homepage/index.html');
 const toggle=x.nodes.find(n=>n.id==='bbpPresetAutoSwitch');
 const check=x.nodes.find(n=>n.id==='bbpPresetAuto');
 const save=x.nodes.find(n=>n.id==='bbpPresetSave');
 assert.ok(toggle);
 assert.ok(source.includes('// @version      0.4.2'));
 assert.match(source,/visibility:visible!important/);
 assert.match(source,/Official PAYAPP CSS may hide native checkbox inputs globally/);
 assert.equal(check.checked,false);
 assert.equal(toggle.attrs['aria-pressed'],'false');
 assert.match(toggle.textContent,/자동 선택 OFF/);
 toggle.listeners.click();
 assert.equal(check.checked,true);
 assert.equal(toggle.attrs['aria-pressed'],'true');
 assert.match(toggle.textContent,/자동 선택 ON/);
 assert.equal(x.storage.has('bbp_payapp_auto_route_v1'),false,'pressing toggle alone must not save');
 save.listeners.click();
 assert.equal(x.storage.get('bbp_payapp_auto_route_v1'),'on');
 toggle.listeners.click();
 assert.equal(check.checked,false);
 assert.match(toggle.textContent,/자동 선택 OFF/);
 save.listeners.click();
 assert.equal(x.storage.get('bbp_payapp_auto_route_v1'),'off');
});

test('www PAYAPP real checkout shows launcher and SCKA1 step is recognized',()=>{
 const first=setup('https://www.payapp.kr/WEBPAY_INPUT/example');
 assert.ok(first.launcher,'www payment checkout must inject');
 first.launcher.listeners.click();
 assert.match(first.status.textContent,/약관 자동 OFF/);
 const card=setup('https://www.payapp.kr/WEBPAY_SCKA1/example',{hasCardField:true,autoOn:true});
 assert.ok(card.launcher,'card entry page must also inject');
 card.launcher.listeners.click();
 assert.match(card.status.textContent,/카드 입력 화면/);
 const actualCardPay=card.label('결제','button');
 card.runTimers();
 assert.equal(actualCardPay.clicked,undefined,'never click payment or read card fields');
 assert.equal(setup('https://www.payapp.kr/WEBPAY_CKA/example').launcher,undefined,'POST agreement endpoint is not a UI stage');
});
test('PAYAPP auto-ON homepage preset transfers from apex to www without sharing localStorage',()=>{
 const sharedGMStorage=new Map();
 const apex=setup('https://payapp.kr/homepage/index.html',{sharedGMStorage});
 apex.nodes.find(n=>n.id==='bbpPresetAutoSwitch').listeners.click();
 apex.nodes.find(n=>n.id==='bbpPresetSave').listeners.click();
 assert.equal(sharedGMStorage.get('bbp_payapp_auto_route_v1'),'on');
 const real=setup('https://www.payapp.kr/WEBPAY_INPUT/example',{sharedGMStorage});
 assert.equal(real.autoToggle.checked,true);
 real.label('결제방식 선택');
 const card=real.label('신용/체크 카드');
 real.runTimers();
 assert.equal(card.clicked,1);
 assert.equal(real.storage.size,0,'www origin should not need homepage localStorage');
});
test('www OFF beats stale apex legacy ON and cannot auto-select a payment method',()=>{
 const gm=new Map([['bbp_payapp_auto_route_v1','off']]);
 const old=new Map([['bbp_payapp_auto_route_v1','on']]);
 const x=setup('https://www.payapp.kr/WEBPAY_INPUT/example',{sharedGMStorage:gm,sharedStorage:old});
 assert.equal(x.autoToggle.checked,false);
 x.label('결제방식 선택');
 const card=x.label('신용/체크 카드');
 x.runTimers();
 assert.equal(card.clicked,undefined);
});
test('older apex ON preference safely migrates into per-userscript cross-host storage',()=>{
 const old=new Map([['bbp_payapp_auto_route_v1','on'],['bbp_payapp_method_v1','card']]);
 const gm=new Map();
 const page=setup('https://payapp.kr/homepage/index.html',{sharedStorage:old,sharedGMStorage:gm});
 assert.ok(page.nodes.find(n=>n.id==='bbpPresetAutoSwitch'));
 assert.equal(gm.get('bbp_payapp_auto_route_v1'),'on');
 const real=setup('https://www.payapp.kr/WEBPAY_INPUT/example',{sharedGMStorage:gm});
 assert.equal(real.autoToggle.checked,true);
});


test('the first PAYAPP agreement screen exposes one clear explicit consent-and-next button',()=>{
 const x=setup('https://www.payapp.kr/WEBPAY_INPUT/checkout');
 const quick=x.nodes.find(n=>n.id==='termsNext');
 assert.ok(quick);
 assert.equal(quick.hidden,false);
 assert.match(quick.textContent,/약관 읽고 동의 → 다음/);
 assert.equal(quick.attrs['aria-label'],'약관을 읽고 동의하며 다음으로 이동');
 assert.ok(source.includes('// @version      0.4.2'));
 const card=setup('https://www.payapp.kr/WEBPAY_SCKA1/card',{hasCardField:true});
 assert.equal(card.nodes.find(n=>n.id==='termsNext').hidden,true,'the agreement button is never available on card input screen');
});
test('one explicit tap triggers one official agreement and next, never on page load',()=>{
 const x=setup('https://www.payapp.kr/WEBPAY_INPUT/test',{autoOn:true});
 const quick=x.nodes.find(n=>n.id==='termsNext');
 const agree=x.label('전체동의','div');
 x.label('전자금융거래 이용약관');
 x.label('개인정보 처리방침 동의');
 const next=x.label('다음','button');
 const pay=x.label('결제','button');
 x.runTimers();
 assert.equal(agree.clicked,undefined,'opted-in payment method selection must not imply financial terms consent');
 assert.equal(next.clicked,undefined);
 quick.listeners.click();
 assert.equal(agree.clicked,1);
 assert.equal(next.clicked,undefined,'submit must follow the official checkbox handler');
 x.runTimers();
 assert.equal(next.clicked,1);
 assert.equal(pay.clicked,undefined);
 quick.listeners.click();
 x.runTimers();
 assert.equal(agree.clicked,1,'never double-click a legal agreement');
 assert.equal(next.clicked,1,'never submit the same agreement twice');
});
test('a missing or ambiguous PAYAPP agreement or Next button fails safely',()=>{
 for(const option of ['missing-terms','two-next','no-official-label']){
  const x=setup('https://www.payapp.kr/WEBPAY_INPUT/test');
  const quick=x.nodes.find(n=>n.id==='termsNext');
  const agree=x.label('전체동의');
  if(option!=='no-official-label'){
   x.label('전자금융거래 이용약관');x.label('개인정보 처리방침 동의');
  }
  const next=x.label('다음','button');
  if(option==='two-next')x.label('다음','button');
  if(option==='missing-terms')x.buttons.splice(x.buttons.indexOf(agree),1);
  quick.listeners.click();x.runTimers();
  assert.equal(next.clicked,undefined);
  assert.match(quick.textContent,/⚠/);
 }
});
test('explicit consent helper never triggers on the saved homepage, on unknown or non-HTTPS pages',()=>{
 assert.equal(setup('https://payapp.kr/homepage/index.html').nodes.some(n=>n.id==='termsNext'),false);
 assert.equal(setup('https://www.payapp.kr/WEBPAY_CKA/test').nodes.some(n=>n.id==='termsNext'),false);
 assert.equal(setup('http://www.payapp.kr/WEBPAY_INPUT/test').nodes.some(n=>n.id==='termsNext'),false);
});

test('terms auto is OFF by default, independent from payment method auto-ON',()=>{
 const g=new Map([['bbp_payapp_auto_route_v1','on']]);
 const p=setup('https://www.payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:g});
 const agree=p.label('전체동의'),next=p.label('다음','button');
 p.label('전자금융거래 이용약관');p.label('개인정보 처리방침 동의');
 p.runTimers();
 assert.equal(agree.clicked,undefined);assert.equal(next.clicked,undefined);
 assert.equal(g.has('bbp_payapp_auto_terms_v1'),false);
});
test('one-time opt-in on homepage causes automatic agreement and Next on a later www checkout',()=>{
 const gm=new Map();
 const home=setup('https://payapp.kr/homepage/index.html',{sharedGMStorage:gm});
 const consent=home.nodes.find(n=>n.id==='bbpPresetTermsAuto');
 const save=home.nodes.find(n=>n.id==='bbpPresetSave');
 assert.ok(consent);
 assert.equal(consent.attrs['aria-pressed'],'false');
 consent.listeners.click();
 assert.equal(consent.attrs['aria-pressed'],'true');
 assert.equal(gm.has('bbp_payapp_auto_terms_v1'),false,'editing choice does not automatically save');
 save.listeners.click();
 assert.equal(gm.get('bbp_payapp_auto_terms_v1'),'on');
 const p=setup('https://www.payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:gm});
 const agree=p.label('전체동의'),next=p.label('다음','button');
 p.label('전자금융거래 이용약관');p.label('개인정보 처리방침 동의');
 const pay=p.label('결제','button');
 p.runTimers();
 assert.equal(agree.clicked,1);
 assert.equal(next.clicked,1);
 assert.equal(pay.clicked,undefined);
 p.mutate();p.runTimers();
 assert.equal(agree.clicked,1);
 assert.equal(next.clicked,1);
});
test('auto terms refuses unknown terms, missing Next and card entry / unknown URLs',()=>{
 const gm=new Map([['bbp_payapp_auto_terms_v1','on']]);
 const p=setup('https://www.payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:gm});
 const agree=p.label('전체동의'),next=p.label('다음','button');
 p.label('전자금융거래 이용약관');
 p.label('새로운 개인정보 약관'); // not the recognized standard label
 p.runTimers();
 assert.equal(agree.clicked,undefined);assert.equal(next.clicked,undefined);
 const x=setup('https://www.payapp.kr/WEBPAY_SCKA1/order',{sharedGMStorage:gm,hasCardField:true});
 const pay=x.label('결제','button');
 x.runTimers();
 assert.equal(pay.clicked,undefined);
});
test('turning auto terms OFF prevents future automatic agreement despite stale origin setting',()=>{
 const gm=new Map([['bbp_payapp_auto_terms_v1','on']]);
 const home=setup('https://payapp.kr/homepage/index.html',{sharedGMStorage:gm});
 const consent=home.nodes.find(n=>n.id==='bbpPresetTermsAuto');
 assert.equal(consent.attrs['aria-pressed'],'true');
 consent.listeners.click();home.nodes.find(n=>n.id==='bbpPresetSave').listeners.click();
 assert.equal(gm.get('bbp_payapp_auto_terms_v1'),'off');
 const p=setup('https://www.payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:gm,sharedStorage:new Map([['bbp_payapp_auto_terms_v1','on']])});
 const agree=p.label('전체동의'),next=p.label('다음','button');
 p.label('전자금융거래 이용약관');p.label('개인정보 처리방침 동의');
 p.runTimers();
 assert.equal(agree.clicked,undefined);assert.equal(next.clicked,undefined);
});

test('PAYAPP v0.4.1 recognizes the actual payment-method title and selects card automatically',()=>{
 const x=setup('https://payapp.kr/WEBPAY_INPUT/demo',{autoOn:true});
 x.label('결제수단 선택');
 const card=x.label('신용/체크 카드');
 x.runTimers();
 assert.equal(card.clicked,1);
 x.mutate();x.runTimers();
 assert.equal(card.clicked,1,'same payment screen must never be clicked twice');
});
test('checkout can explicitly enable the independent agreement auto-switch',()=>{
 const x=setup('https://payapp.kr/WEBPAY_INPUT/demo');
 const toggle=x.nodes.find(n=>n.id==='bbpCheckoutTermsAuto');
 assert.ok(toggle);
 assert.equal(toggle.attrs['aria-pressed'],'false');
 const agree=x.label('전체동의','div');
 x.label('전자금융거래 이용약관','label');
 x.label('개인정보 처리방침 동의','label');
 const next=x.label('다음','button');
 toggle.listeners.click();
 assert.equal(x.gmStorage.get('bbp_payapp_auto_terms_v1'),'on');
 assert.equal(toggle.attrs['aria-pressed'],'true');
 x.runTimers();
 assert.equal(agree.clicked,1);
 assert.equal(next.clicked,1);
 toggle.listeners.click();
 assert.equal(x.gmStorage.get('bbp_payapp_auto_terms_v1'),'off');
});
test('unknown or duplicate payment tiles fail closed and card security data is untouched',()=>{
 const x=setup('https://payapp.kr/WEBPAY_INPUT/demo',{autoOn:true});
 x.label('결제수단 선택');
 const a=x.label('신용/체크 카드'),b=x.label('신용/체크 카드');
 x.runTimers();
 assert.equal(a.clicked,undefined);
 assert.equal(b.clicked,undefined);
 assert.equal(x.storage.size,1,'only existing navigation preference is stored');
 assert.doesNotMatch(source,/CardNo1\s*\.\s*value/);
 assert.doesNotMatch(source,/birth(?:day|date)|cardPin|password\s*\.\s*value/i);
});


test('automatic terms recognizes visible direct text beside checkbox and View children without reading input values',()=>{
 const gm=new Map([['bbp_payapp_auto_terms_v1','on']]);
 const p=setup('https://payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:gm});
 const agree=p.label('전체동의');const next=p.label('다음','button');const pay=p.label('결제','button');
 for(const text of ['전자금융거래 이용약관','개인정보 처리방침 동의']){
  const label=p.label(text+' 보기','label');
  const input={tagName:'INPUT'};Object.defineProperty(input,'value',{get(){throw Error('must not read field values');}});
  label.children=[input,{tagName:'A',textContent:'보기'}];
  label.childNodes=[input,{nodeType:3,textContent:' '+text+' '},label.children[1]];
 }
 p.runTimers();
 assert.equal(agree.clicked,1);assert.equal(next.clicked,1);assert.equal(pay.clicked,undefined);
 p.mutate();p.runTimers();assert.equal(agree.clicked,1);assert.equal(next.clicked,1);
});
test('nested checkbox text still rejects a changed legal heading',()=>{
 const gm=new Map([['bbp_payapp_auto_terms_v1','on']]);
 const p=setup('https://payapp.kr/WEBPAY_INPUT/order',{sharedGMStorage:gm});
 const agree=p.label('전체동의'),next=p.label('다음','button');
 for(const text of ['전자금융거래 이용약관','개인정보 처리방침 동의 추가선택']){
  const label=p.label(text,'label');label.children=[{tagName:'INPUT'}];label.childNodes=[{nodeType:3,textContent:text}];
 }
 p.runTimers();assert.equal(agree.clicked,undefined);assert.equal(next.clicked,undefined);
});
