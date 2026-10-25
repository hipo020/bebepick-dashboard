'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-payapp-methods.user.js'),'utf8');
const ctor=()=>({display:'block',visibility:'visible'});
function setup(url='https://payapp.kr/WEBPAY_INPUT/demo'){
 const u=new URL(url),buttons=[],storage=new Map(),nodes=[];
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
 const document={
  body,documentElement:body,createElement:el,
  querySelectorAll:()=>buttons
 };
 const window={};window.top=window;window.self=window;
 const context={
  location:{hostname:u.hostname,protocol:u.protocol,pathname:u.pathname},
  document,window,getComputedStyle:ctor,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 };
 vm.runInNewContext(source,context);
 const launcher=nodes.find(x=>x.id==='launcher'),panel=nodes.find(x=>x.id==='panel');
 const select=nodes.find(x=>x.tagName==='SELECT');
 const go=nodes.find(x=>x.id==='go'),status=nodes.find(x=>x.id==='status');
 function label(text,tag='div'){const x=el(tag);x.textContent=text;buttons.push(x);return x;}
 return {launcher,panel,select,go,status,storage,label,buttons,nodes};
}
test('checkout helper launcher is visible away from a right-side floating overlay',()=>{
 assert.match(source,/position:fixed;left:10px;top:68px/);
 assert.match(source,/z-index:2147483646/);
 assert.doesNotMatch(source,/position:fixed;right:8px;top:10px/);
});
test('userscript is parsed and narrowly restricted to official PAYAPP checkout',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(source,/\/\/ @match\s+https:\/\/payapp\.kr\/WEBPAY_INPUT\/\*/);
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
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|navigator\.clipboard|sendBeacon|\.submit\s*\(/);
 assert.doesNotMatch(source,/document\.querySelectorAll\([^\n]*input/);
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
