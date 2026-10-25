'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const begin=src.indexOf("document.addEventListener('click',event=>{");
const end=src.indexOf("},true);",begin);
assert.ok(begin>0&&end>begin,'trusted manual click capture must be in bookmarklet');
const captureSrc=src.slice(begin,end+"},true);".length);
function simulate({trusted,completed=true,dryRun=false,submitClicked=true,wizardTimer=null,targetOk=true}={}){
 const marks=[],notices=[],timers=[],listeners={};
 const ctx={
  completed,dryRun,submitClicked,wizardTimer,autoOrder:true,manualSubmitObserved:false,
  document:{addEventListener:(event,handler,capture)=>{assert.equal(event,'click');assert.equal(capture,true);listeners.click=handler}},
  timingOnce:(...a)=>marks.push(a),message:x=>notices.push(x),
  clearInterval:id=>timers.push(id)
 };
 new Function('ctx','with(ctx){'+captureSrc+'}')(ctx);
 listeners.click({isTrusted:trusted,target:{
  closest:selector=>targetOk?{closest:()=>({})}:null
 }});
 return {ctx,marks,notices,timers};
}
test('v2.4 still compiles and allows only one guarded same-modal follow-up after ignored final click',()=>{
 assert.doesNotThrow(()=>new Function(src));
 const wizard=src.slice(src.indexOf('function watchWizard(){'),src.indexOf('function watchPrePayment(){'));
 assert.match(wizard,/timingOnce\('submit_click','스크립트 \.click\(\) 시도/);
 assert.match(wizard,/try\{ok\.click\(\);\}/);
 assert.match(wizard,/submitClicked=true/);
 assert.match(wizard,/canRetrySameOfficialDialog\(box,ok,all\)/);
 assert.match(wizard,/submitAttemptAt-finalAgreeAt<900/);
 assert.equal((wizard.match(/ok\.click\(\)/g)||[]).length,2);
});
test('synthetic click event is NOT marked as human input',()=>{
 const t=simulate({trusted:false});
 assert.equal(t.ctx.manualSubmitObserved,false);
 assert.deepEqual(t.marks.map(x=>x[0]),['submit_dom_event']);
});
test('trusted human tap IS marked separately from earlier script click',()=>{
 const t=simulate({trusted:true});
 assert.equal(t.ctx.manualSubmitObserved,true);
 assert.deepEqual(t.marks.map(x=>x[0]),['submit_manual_click']);
});
test('human tap before script submit disables automation rather than causing duplicate attempts',()=>{
 const t=simulate({trusted:true,submitClicked:false,wizardTimer:123});
 assert.equal(t.ctx.autoOrder,false);
 assert.equal(t.ctx.wizardTimer,null);
 assert.deepEqual(t.timers,[123]);
 assert.equal(t.ctx.manualSubmitObserved,true);
});
test('no unrelated/hidden checkout clicks are recorded',()=>{
 assert.equal(simulate({trusted:true,completed:false}).marks.length,0);
 assert.equal(simulate({trusted:true,dryRun:true}).marks.length,0);
 assert.equal(simulate({trusted:true,targetOk:false}).marks.length,0);
});
test('pay panel origin remains uncertain when script alone was observed',()=>{
 assert.match(src,/timingOnce\('pay_panel_origin',manualSubmitObserved\?/);
 assert.match(src,/자동 클릭 단독 성공인지는 별도 확인 필요/);
});
