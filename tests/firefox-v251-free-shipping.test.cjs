'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const launcher=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-one-tap.user.js'),'utf8');

const start=src.indexOf(' function chosenOrderOptionsSnapshot(){');
const end=src.indexOf(' function staleOfficialUi(reason){',start);
assert.ok(start>0&&end>start);
const optionFunctions=src.slice(start,end)+'\n;({chosenOrderOptionsSnapshot,officialFreeShippingOption,correctOrderControls,officialConfirmationChoicesMatch})';
function fixture({voucher=true,checked=false,requested=false,disabled=false,multiple=false}={}){
 const opts={storage:'보관',open:'개봉',note:null,anon:false,use_free_ship:checked};
 const makeButton=()=>{
  const classes=new Set(checked?['pk-toggle','on']:['pk-toggle']);
  const b={
   disabled,
   classList:{contains:k=>classes.has(k)},
   getAttribute:k=>k==='aria-disabled'?null:null,
   click(){
    if(this.disabled)return;
    if(classes.has('on'))classes.delete('on');else classes.add('on');
    opts.use_free_ship=classes.has('on');
   }
  };return b;
 };
 const btns=voucher?(multiple?[makeButton(),makeButton()]:[makeButton()]):[];
 const chosenButton=()=>({getAttribute:k=>k==='aria-checked'?'true':null,click(){}});
 const panel={
  querySelectorAll(selector){
   if(selector==='button[data-perk-fs]')return btns;
   return [];
  },
  querySelector(selector){
   if(selector==='button[data-perk-fs]')return btns[0]||null;
   if(selector==='[data-storage="보관"]'||selector==='[data-open="개봉"]')return chosenButton();
   if(selector==='#noteRow'||selector==='#anonRow')return null;
   return null;
  }
 };
 const ctx={storage:'보관',effectiveStorage:'보관',forcedShippingAccepted:false,firstStepChoicesVerified:false,open:'개봉',pick:'직접 고르기',display:'닉네임',
  syncForcedDirectShipping:()=>false,officialForcedDirectShippingEvidence:()=>false,
  freeShip:requested,OPTS_KEY:'bbp_order_opts',sessionStorage:{getItem:()=>JSON.stringify(opts)},
  Array,JSON,Number,el:(sel,p)=>p.querySelector(sel)};
 const fn=vm.runInNewContext(optionFunctions,ctx);
 return {fn,ctx,opts,panel,btns};
}
test('new script remains valid and free-shipping selector is in the visible order options',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.match(src,/id="qFreeShip"/);
 assert.match(src,/option value="off">사용 안 함/);
 assert.match(src,/option value="on">보유 무료배송권 1장 사용/);
 assert.match(src,/let freeShip=pref\.freeShip===true/);
 assert.match(src,/freeShip,flowMode,items/);
 assert.match(src,/v\.use_free_ship=freeShip/);
 assert.match(src,/freeShip=controls\.freeShip\.value==='on'/);
 assert.match(src,/controls\.freeShip\.value=freeShip\?'on':'off'/);
 assert.match(src,/controls\.freeShip\]\.forEach/);
});
test('official coupon OFF is default and remains unconsumed without a voucher row',()=>{
 const v=fixture({voucher:false,requested:false});
 assert.equal(v.fn.officialFreeShippingOption(v.panel),true);
 assert.equal(v.fn.correctOrderControls(v.panel),true);
 assert.equal(v.fn.chosenOrderOptionsSnapshot(),true);
});
test('explicit coupon use toggles exactly one available official voucher to ON',()=>{
 const v=fixture({checked:false,requested:true});
 assert.equal(v.fn.officialFreeShippingOption(v.panel),true);
 assert.equal(v.opts.use_free_ship,true);
 assert.equal(v.btns[0].classList.contains('on'),true);
 assert.equal(v.fn.correctOrderControls(v.panel),true);
 assert.equal(v.fn.chosenOrderOptionsSnapshot(),true);
 const dialog={querySelector:()=>null};
 assert.equal(v.fn.officialConfirmationChoicesMatch(dialog,true),true);
});
test('saved use OFF can disable a previously selected coupon without consuming it',()=>{
 const v=fixture({checked:true,requested:false});
 assert.equal(v.fn.correctOrderControls(v.panel),true);
 assert.equal(v.opts.use_free_ship,false);
 assert.equal(v.btns[0].classList.contains('on'),false);
 assert.equal(v.fn.chosenOrderOptionsSnapshot(),true);
});
test('requested coupon when missing/disabled/ambiguous fails closed',()=>{
 for(const opts of [{voucher:false},{disabled:true},{multiple:true}]){
  const v=fixture({...opts,requested:true});
  assert.equal(v.fn.officialFreeShippingOption(v.panel),false);
  assert.equal(v.fn.correctOrderControls(v.panel),false);
 }
});
test('server/site session cannot silently turn coupon off before final order',()=>{
 const v=fixture({checked:true,requested:true});
 assert.equal(v.fn.correctOrderControls(v.panel),true);
 v.opts.use_free_ship=false;
 assert.equal(v.fn.chosenOrderOptionsSnapshot(),false);
 const dialog={querySelector:()=>null};
 assert.equal(v.fn.officialConfirmationChoicesMatch(dialog,false),false);
});
test('voucher is included in all purchase-consent text, no automatic spending or backend request',()=>{
 assert.ok((src.match(/무료배송권 '\+\(freeShip\?'사용':'미사용'\)/g)||[]).length>=2);
 assert.match(src,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(src,/if\(!officialFreeShippingOption\(cartPanel\)\)return false/);
 assert.match(src,/!officialConfirmationChoicesMatch\(box,true\)/);
 assert.match(src,/!officialConfirmationChoicesMatch\(box,false\)/);
 assert.match(launcher,/v=20261107-v253-visible-catalog/);
 assert.match(launcher,/@version\s+1\.2\.3/);
});

