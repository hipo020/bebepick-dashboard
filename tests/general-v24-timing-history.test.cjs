'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const htmlExpr=src.slice(src.indexOf('panel.innerHTML='),src.indexOf('document.body.appendChild(panel);'));
const html=new Function("const panel={innerHTML:''},inputStyle='width:100%',rowStyle='display:flex';"+htmlExpr+";return panel.innerHTML;")();

function fakeStore(){
 const data=new Map();
 return {setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)||null,removeItem:k=>data.delete(k),data};
}
function historyHarness(){
 const chunk=src.slice(src.indexOf('function saveTimingSnapshot(){'),src.indexOf('function timingRender(){'));
 const head=[
 "let timingStartedAt='2026-10-24T00:00:00Z', timingHistory=[],selectedHistoryId='',",
 "timingStorageOk=true,lastSavedReport=null,timingPersistTimer=null;",
 "const TIMING_HISTORY_KEY='history',TIMING_KEY='last',TIMING_HISTORY_LIMIT=8,STORE='china';",
 "let serial=0;",
 "const timingReport=()=>({kind:'bebepick-quick-order-timing-v24',store:'china',",
 "startedAt:timingStartedAt, events:[{event:'wizard_state_wait',detail:'최종 체크=N',sequence:serial}],",
 "payAppAutoOpenRequested:false,stats:{checks:serial}});",
 "const renderTimingHistory=()=>{};",
 "const localStorage=storeA,sessionStorage=storeB;"
 ].join('\n');
 const tail="return {saveTimingSnapshot,setRun:(v)=>{timingStartedAt=v;serial++},getHistory:()=>timingHistory,valid:()=>timingStorageOk};";
 const storeA=fakeStore(),storeB=fakeStore();
 const h=new Function('storeA','storeB',head+chunk+tail)(storeA,storeB);
 return {...h,local:storeA,session:storeB};
}
test('script compiles with browser history feature and critical UI IDs present',()=>{
 assert.doesNotThrow(()=>new Function(src));
 for(const id of ['qTimingHistory','qTimingHistoryView','qTimingHistoryClear','qTimingPersistStatus','qTimingCopy','qTimingDownload','qStart'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/최근 8회/);
});
test('autosaving a run persists latest in localStorage and sessionStorage',()=>{
 const h=historyHarness();h.saveTimingSnapshot();
 assert.equal(JSON.parse(h.local.getItem('last')).startedAt,'2026-10-24T00:00:00Z');
 assert.equal(JSON.parse(h.session.getItem('last')).kind,'bebepick-quick-order-timing-v24');
 assert.equal(h.getHistory().length,1);
});
test('runs are bounded to most recent eight; saving same startedAt updates in place',()=>{
 const h=historyHarness();
 for(let i=0;i<13;i++){h.setRun('run-'+i);h.saveTimingSnapshot();}
 assert.equal(h.getHistory().length,8);
 assert.equal(h.getHistory()[0].startedAt,'run-12');
 assert.equal(h.getHistory()[7].startedAt,'run-5');
 h.saveTimingSnapshot();
 assert.equal(h.getHistory().length,8);
 assert.equal(JSON.parse(h.local.getItem('history')).length,8);
});
test('automatic persist is throttled and stop snapshots before page unload',()=>{
 assert.match(src,/setTimeout\(\(\)=>\{timingPersistTimer=null;saveTimingSnapshot\(\);\},300\)/);
 assert.match(src,/function timingStop\(detail\)\{[\s\S]*?saveTimingSnapshot\(\)/);
 assert.match(src,/window\.addEventListener\('pagehide',\(\)=>\{stop\(\);/);
 assert.match(src,/localStorage\.setItem\(TIMING_HISTORY_KEY,JSON\.stringify\(timingHistory\)\)/);
 assert.match(src,/if\(last&&last\.kind==='bebepick-quick-order-timing-v24'/);
});
test('stalled official confirmation records presence and checkout options',()=>{
 assert.match(src,/function wizardShape\(\)/);
 assert.match(src,/최종 버튼 활성/);
 assert.match(src,/timingOnce\('checkout_plan'/);
 assert.match(src,/timingMark\('safety_stop',why\+' · '\+wizardShape\(\)\)/);
 assert.match(src,/timingOnce\('wizard_state_wait'/);
 assert.match(src,/timingMark\('wizard_timeout',wizardShape\(\)\)/);
});
test('history view, export and deletion are gated, without recording payment information',()=>{
 assert.match(src,/controls\.timingHistoryView\.onclick=/);
 assert.match(src,/controls\.timingHistoryClear\.onclick=/);
 assert.match(src,/if\(!confirm\('이 브라우저의 '/);
 assert.match(src,/const chosen=selectedHistoryId\?timingHistory\.find/);
 const obj=src.slice(src.indexOf('function timingReport(){'),src.indexOf('function historyRow('));
 assert.doesNotMatch(obj,/cardNumber|CVC|CVV|token|cookie|orderId/);
});
