'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const oneTap=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-one-tap.user.js'),'utf8');

test('v2.5 guided flow builds cleanly and has three understandable steps',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 for(const label of ['01 · 어떤 인형을 살까?','02 · 주문 옵션','03 · 어디까지 자동으로 할까?'])
  assert.ok(src.includes(label),label);
 assert.match(src,/id="qFlowMode"/);
 assert.match(src,/id="qFlowHelp"/);
 assert.match(src,/id="qAdvanced"/);
 assert.match(src,/aria-live="polite"/);
 assert.match(src,/details>summary/);
 assert.match(src,/actionBar\.style\.cssText='position:sticky/);
 assert.match(src,/advanced\.appendChild\(cycleRow\)/);
});
test('default flow preference is PAYAPP without persisting permission to create orders',()=>{
 assert.match(src,/includes\(pref\.flowMode\)\?pref\.flowMode:'payapp'/);
 assert.match(src,/flowMode,items,watchMode/);
 assert.match(src,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(src,/autoPay=controls\.payAppPage\.checked===true/);
 assert.match(src,/if\(autoPay&&\(controls\.dryRun\.checked\|\|!controls\.autoOrder\.checked\)\)/);
 assert.match(src,/payArmed=autoPay&&!dryRun/);
 assert.match(src,/if\(recentSubmit\(\)\)/);
 assert.match(oneTap,/The remote helper is loaded ONLY after the user's direct tap/);
});
const begin=src.indexOf(' function applyFlowMode(mode){');
const end=src.indexOf(" controls.flowMode.addEventListener('change'",begin);
assert.ok(begin>=0&&end>begin);
function env(){
 const ctx={
  flowMode:'payapp',
  controls:{flowMode:{value:''},autoOrder:{checked:false},dryRun:{checked:true},payAppPage:{checked:false}},
  updateSafetyLabel(){this.updated=(this.updated||0)+1;}
 };
 const apply=new Function('ctx','with(ctx){'+src.slice(begin,end)+'return applyFlowMode;}')(ctx);
 return {ctx,apply};
}
test('PAYAPP default is visible but still requires explicit start/consent',()=>{
 const e=env();e.apply('payapp');
 assert.equal(e.ctx.controls.flowMode.value,'payapp');
 assert.equal(e.ctx.controls.autoOrder.checked,true);
 assert.equal(e.ctx.controls.dryRun.checked,false);
 assert.equal(e.ctx.controls.payAppPage.checked,true);
 assert.equal(e.ctx.updated,undefined); // test stub only; underlying user must click Start
});
test('manual, dry-run and order-only choices map to safe distinct flags',()=>{
 const e=env();
 e.apply('watch');
 assert.deepEqual([e.ctx.controls.autoOrder.checked,e.ctx.controls.dryRun.checked,e.ctx.controls.payAppPage.checked],[false,true,false]);
 e.apply('dry');
 assert.deepEqual([e.ctx.controls.autoOrder.checked,e.ctx.controls.dryRun.checked,e.ctx.controls.payAppPage.checked],[true,true,false]);
 e.apply('order');
 assert.deepEqual([e.ctx.controls.autoOrder.checked,e.ctx.controls.dryRun.checked,e.ctx.controls.payAppPage.checked],[true,false,false]);
 e.apply('unrecognized');
 assert.equal(e.ctx.controls.flowMode.value,'payapp');
});
test('visible choices are not live financial actions and remain guarded',()=>{
 assert.match(src,/controls\.flowMode\.addEventListener\('change'/);
 assert.match(src,/if\(active\|\|completed\)\{controls\.flowMode\.value=flowMode/);
 assert.match(src,/savePref\(\)/);
 assert.match(src,/el\('#qStart',panel\)\.onclick=async\(\)=>/);
 assert.match(src,/if\(autoOrder&&!dryRun\)\{/);
 assert.match(src,/if\(!confirm\(exactConsent\)\)return/);
});
