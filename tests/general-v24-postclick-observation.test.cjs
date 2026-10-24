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
