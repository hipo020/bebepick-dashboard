'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const matcher=src.slice(src.indexOf('function matchesStorage(value){'),src.indexOf('function latestAvailability(',src.indexOf('function matchesStorage(value){')));
const begin=src.indexOf(' function officialForcedDirectShippingEvidence(){');
const end=src.indexOf(' function staleOfficialUi(reason){',begin);
assert.ok(begin>0&&end>begin);
const real=matcher+'\n'+src.slice(begin,end)+'\n;({matchesStorage,officialForcedDirectShippingEvidence,syncForcedDirectShipping,chosenOrderOptionsSnapshot,officialConfirmationChoicesMatch})';

function scenario({forced=true,notice=true,fee=0,storageOption='발송',cartVisible=true,
   selectShip=true,pick='셀러픽',anon=false}={}){
 const report=[],opts={storage:storageOption,open:'개봉',note:pick==='셀러픽'?{pick:true}:null,anon,use_free_ship:true};
 const keep={disabled:forced,hasAttribute:k=>k==='disabled'&&forced,getAttribute:k=>k==='aria-disabled'&&forced?'true':null,classList:{contains:k=>k==='disabled'&&forced}};
 const ship={getAttribute:k=>k==='aria-checked'&&selectShip?'true':'false'};
 const cart={innerText:(notice?'오늘은 보관 일괄 발송일이라 오늘은 바로 배송만 가능합니다. ':'오늘은 배송 방식 선택 가능. ')+'배송비 '+fee.toLocaleString('en-US')+'원',
  querySelector:s=>s==='[data-storage="보관"]'?keep:s==='[data-storage="발송"]'?ship:null};
 const ctx={
  storage:'보관',effectiveStorage:'보관',forcedShippingAccepted:false,firstStepChoicesVerified:false,
  pick,display:anon?'익명':'닉네임',open:'개봉',freeShip:true,OPTS_KEY:'bbp_order_opts',
  sessionStorage:{getItem:()=>JSON.stringify(opts)},
  el:s=>s==='.panel[data-sheet="cart"]'&&cartVisible?cart:null,
  timingOnce:(...a)=>report.push(a),message:s=>report.push(s),Array,Number,String,JSON
 };
 const funcs=vm.runInNewContext(real,ctx,{filename:'forced-shipping-extract.js'});
 function confirm(firstStep,note2Exists=false){
  return {querySelector(sel){
    if(sel==='#ocNote'||sel==='#ocNote2')return (sel==='#ocNote'||note2Exists)?{textContent:'인형 고르기: 셀러픽'}:null;
    if(sel==='#ocAnon')return null;
    return null;
  }};
 }
 return {ctx,funcs,opts,cart,keep,ship,report,confirm};
}
test('valid forced delivery with zero shipping fee can be acknowledged once',()=>{
 const x=scenario();
 assert.equal(x.funcs.officialForcedDirectShippingEvidence(),true);
 assert.equal(x.funcs.syncForcedDirectShipping(),true);
 assert.equal(x.ctx.effectiveStorage,'발송');
 assert.equal(x.ctx.forcedShippingAccepted,true);
 assert.equal(x.funcs.matchesStorage('바로 배송'),true);
 assert.equal(x.funcs.chosenOrderOptionsSnapshot(),true);
 assert.match(x.report.map(String).join(' '),/배송비 0원/);
});
test('forced delivery never bypasses shipping cost or missing site evidence',()=>{
 for(const args of [
  {fee:4000},{fee:1},{forced:false},{selectShip:false},
  {notice:false},{storageOption:'보관'}
 ]){
  const x=scenario(args);
  assert.equal(x.funcs.officialForcedDirectShippingEvidence(),false,JSON.stringify(args));
  assert.equal(x.funcs.matchesStorage('바로 배송'),false,JSON.stringify(args));
  assert.equal(x.ctx.effectiveStorage,'보관');
 }
});
test('a verified forced delivery survives removal of the underlying cart during confirmation',()=>{
 const x=scenario();
 assert.equal(x.funcs.syncForcedDirectShipping(),true);
 x.ctx.el=()=>null;
 assert.equal(x.funcs.matchesStorage('발송'),true);
 assert.equal(x.funcs.chosenOrderOptionsSnapshot(),true);
 x.opts.storage='보관';
 assert.equal(x.funcs.chosenOrderOptionsSnapshot(),false);
});
test('explicit seller pick may omit the final label only after first-stage proof',()=>{
 const x=scenario();
 x.funcs.syncForcedDirectShipping();
 const step1=x.confirm(true),step2=x.confirm(false);
 assert.equal(x.funcs.officialConfirmationChoicesMatch(step1,true),true);
 assert.equal(x.funcs.officialConfirmationChoicesMatch(step2,false),false);
 x.ctx.firstStepChoicesVerified=true;
 assert.equal(x.funcs.officialConfirmationChoicesMatch(step2,false),true);
 x.opts.note=null;
 assert.equal(x.funcs.officialConfirmationChoicesMatch(step2,false),false);
});
test('real order permission remains separate, and per-run shipping state is reset',()=>{
 assert.match(src,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(src,/effectiveStorage=storage;forcedShippingAccepted=false;firstStepChoicesVerified=false;savePref/);
 assert.match(src,/firstStepChoicesVerified=true;wizardStage=1/);
 assert.match(src,/if\(dryRun\)/);
 assert.match(src,/if\(recentSubmit\(\)\)/);
 assert.match(src,/배송비가 정확히 0원/);
 assert.match(src,/shipping_forced:'공식 보관 불가/);
 assert.doesNotMatch(src,/window\.location\.assign\(.+payapp\.kr/);
});
