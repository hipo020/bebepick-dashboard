'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const begin=src.indexOf('function submitAfterClickShape(){');
const end=src.indexOf('// Only the official payment button may be clicked once',begin);
assert.ok(begin>0&&end>begin);
const code=src.slice(begin,end);
function run({recent=[],baseline=0,hasDialog=true,human=false}={}){
 const dialog=hasDialog?{isConnected:true,querySelector:selector=>selector==='[data-oc="ok"]'?{disabled:false}:null}:null;
 const ctx={el:selector=>dialog,submitResourceBaseline:baseline,manualSubmitObserved:human,
  performance:{getEntriesByType:t=>{assert.equal(t,'resource');return recent.map(name=>({name}))}},
  location:{href:'https://bebepick.me/plus'}};
 const result=new Function('ctx','with(ctx){'+code+' return submitAfterClickShape();}')(ctx);
 return result;
}
test('read-only post-click probe compiles and never clicks or submits anything',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.doesNotMatch(code,/\.click\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|authorization/);
 const wizard=src.slice(src.indexOf('function watchWizard(){'),src.indexOf('function submitAfterClickShape(){'));
 assert.equal((wizard.match(/ok\.click\(\)/g)||[]).length,1);
});
test('detects only count of order-related resource timing entries after snapshot',()=>{
 const result=run({recent:['https://bebepick.me/app.js','https://eqytdtxemjlygnobhiio.supabase.co/rest/v1/rpc/create_order'],baseline:1});
 assert.match(result,/주문요청 흔적=Y/);
 assert.doesNotMatch(result,/supabase|create_order|bearer|https/);
});
test('does not confuse status polling with confirmed order request',()=>{
 const result=run({recent:['https://eqytdtxemjlygnobhiio.supabase.co/rest/v1/rpc/order_windows']});
 // order_windows is a status check, not an order submission.
 assert.match(result,/주문요청 흔적=N/);
});
test('manual click origin and modal presence are captured without user information',()=>{
 assert.match(run({hasDialog:false,human:true}),/최종창=N.*사용자 클릭=Y/);
 assert.match(run({hasDialog:true,human:false}),/최종창=Y.*사용자 클릭=N/);
});
test('post-click diagnostics fire after 2 and 5 seconds without extra click',()=>{
 assert.match(src,/if\(since>=2000\)timingOnce\('submit_post_2s',submitAfterClickShape\(\)\)/);
 assert.match(src,/if\(since>=5000\)\{/);
 assert.match(src,/timingOnce\('submit_stalled_5s',submitAfterClickShape\(\)\)/);
 assert.match(src,/mini\.textContent='⚠ 최종 주문 클릭 후 화면 전환 미확인/);
 assert.match(src,/payArmed&&Date\.now\(\)>payDeadline/);
});

test('read-only consent snapshots record flags without touching the form',()=>{
 const start=src.indexOf('function finalConsentSnapshot(){');
 const end=src.indexOf('function abortWizard(',start);
 assert.ok(start>0&&end>start);
 const code=src.slice(start,end);
 assert.doesNotMatch(code,/\.click\s*\(|dispatchEvent|fetch\s*\(|XMLHttpRequest|\.value\b|textContent|innerHTML|localStorage|sessionStorage/);
 const read=({present=true,checked=true,disabled=false,ariaDisabled=false}={})=>{
  const dialog=present?{
   isConnected:true,
   querySelector:q=>q==='#ocAll'?{checked}:q==='[data-oc="ok"]'?{disabled,getAttribute:key=>key==='aria-disabled'?(ariaDisabled?'true':'false'):null}:null
  }:null;
  return new Function('ctx','with(ctx){'+code+' return finalConsentSnapshot();}')({
   el:()=>dialog
  });
 };
 assert.equal(read(),'창유지=Y · 동의체크=Y · 버튼활성=Y · aria차단=N');
 assert.equal(read({checked:false,disabled:true,ariaDisabled:true}),'창유지=Y · 동의체크=N · 버튼활성=N · aria차단=Y');
 assert.equal(read({present:false}),'창유지=N · 동의체크=N · 버튼활성=N · aria차단=N');
});

test('read-only snapshots are collected around the existing single final click',()=>{
 const wizard=src.slice(src.indexOf('function watchWizard(){'),src.indexOf('function submitAfterClickShape(){'));
 assert.ok(wizard.indexOf("timingOnce('submit_preflight_state'")<wizard.indexOf('try{ok.click();}'));
 assert.ok(wizard.indexOf("timingOnce('submit_after_call_state'")>wizard.indexOf('try{ok.click();}'));
 assert.equal((wizard.match(/ok\.click\(\)/g)||[]).length,1);
 assert.match(src,/if\(since>=2000\)timingOnce\('submit_state_2s',finalConsentSnapshot\(\)\)/);
 assert.match(src,/timingOnce\('submit_state_5s',finalConsentSnapshot\(\)\)/);
});

test('official final-confirm arm window is respected before single order click',()=>{
 const begin=src.indexOf('const finalReadyAge=Date.now()-finalAgreeAt;');
 const end=src.indexOf('if(ok.disabled||!all.checked||!box.isConnected)',begin);
 assert.ok(begin>0&&end>begin,'required consent delay guard must precede button checks');
 const fragment=src.slice(begin,end);
 assert.doesNotMatch(fragment,/\.click\s*\(|fetch\s*\(|dispatchEvent|XMLHttpRequest/);
 const run=age=>{
  const marks=[];
  const context={
   Date:{now:()=>5000},
   finalAgreeAt:5000-age,
   timingOnce:(...args)=>marks.push(args)
  };
  const result=new Function('ctx','with(ctx){return (function(){'+fragment+' return "ready";})()}')(context);
  return {result,marks};
 };
 for(const age of [0,200,699,700,899]){
  const v=run(age);assert.equal(v.result,undefined,'must not continue at '+age+'ms');
  assert.equal(v.marks[0][0],'final_arm_wait');
 }
 for(const age of [900,950,1400]){
  const v=run(age);assert.equal(v.result,'ready','can continue after 900ms');
  assert.equal(v.marks[0][0],'final_arm_elapsed');
 }
 const wizard=src.slice(src.indexOf('function watchWizard(){'),src.indexOf('function submitAfterClickShape(){'));
 assert.ok(wizard.indexOf('if(finalReadyAge<900)')<wizard.indexOf('try{ok.click();}'));
 assert.equal((wizard.match(/ok\.click\(\)/g)||[]).length,1,'order is never retried');
 assert.match(wizard,/if\(recentSubmit\(\)\)\{abortWizard\('중복 주문 요청 방지'\)/);
});
