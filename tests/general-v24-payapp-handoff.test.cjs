'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const begin = src.indexOf('function watchPrePayment(){');
const finish = src.indexOf('const ob=new MutationObserver(',begin);
assert.ok(begin > 0 && finish > begin);
const isolated = src.slice(begin, finish);
function scenario({
 text='주문서를 만들었습니다 주문번호 BP1234567890',
 before='', auto=true, hidden=false, disabled=false, ageMs=0, sheetVisible=true
}={}){
 const clicks = [];
 const statuses = [];
 const timings = [];
 const btn = {isConnected:true,disabled,getAttribute:()=>null,click:()=>clicks.push('official-pay-button')};
 const sheet = {
  isConnected:true,hidden:!sheetVisible,textContent:text,
  querySelector:(q)=>q==='[data-act="pay-card"]'?btn:null
 };
 const c={
  submitClicked:true,payDone:false,payArmed:auto,payDeadline:Date.now()+15000-ageMs,
  oldPayOrder:before,document:{hidden},mini:{textContent:''},folded:false,
  el:(selector)=>selector==='.panel[data-sheet="pay"]'?sheet:null,
  getComputedStyle:()=>({display:'block'}),
  timingOnce:(...x)=>timings.push(x),
  timingMark:(...x)=>timings.push(x),
  message:x=>statuses.push(x),
  revealOfficial:()=>{throw new Error('not folded')},
 };
 const run = new Function('c','with(c){'+isolated+';return watchPrePayment;}')(c);
 return {c,clicks,timings,statuses,run};
}
test('script parses, opt-in checkbox defaults unchecked, and payment approval stays manual',()=>{
 assert.doesNotThrow(()=>new Function(src));
 const a=src.slice(src.indexOf('panel.innerHTML='),src.indexOf('document.body.appendChild(panel);'));
 assert.match(a,/id="qPayAppPage"/);
 assert.doesNotMatch(a,/id="qPayAppPage" checked/);
 assert.match(a,/id="qDryRun" checked/);
 assert.match(src,/if\(!autoPay&&armedMode==='mixed'\)/);
 assert.match(src,/payArmed=autoPay&&!dryRun/);
 assert.match(src,/if\(autoPay&&\(!autoOrder\|\|dryRun\)\)/);
 assert.doesNotMatch(isolated,/document\.querySelector\('[^']*payapp/i);
});
test('only newly confirmed order leads to one official Pay button click',()=>{
 const p=scenario();p.run();p.run();
 assert.deepEqual(p.clicks,['official-pay-button']);
 assert.equal(p.c.payArmed,false);assert.equal(p.c.payDone,true);
 assert.ok(p.timings.some(x=>x[0]==='pay_card_click'));
});
test('old visible order is never clicked again',()=>{
 const p=scenario({before:'BP1234567890'});p.run();assert.deepEqual(p.clicks,[]);
});
test('missing server-confirmed order number prevents handoff',()=>{
 const p=scenario({text:'주문번호를 확인하고 있습니다'});p.run();assert.deepEqual(p.clicks,[]);
});
test('hidden browser prevents checkout handoff even after order confirmation',()=>{
 const p=scenario({hidden:true});p.run();assert.deepEqual(p.clicks,[]);
 assert.equal(p.c.payArmed,false);
});
test('disabled official button prevents handoff',()=>{
 const p=scenario({disabled:true});p.run();assert.deepEqual(p.clicks,[]);
});
test('elapsed max handoff window prevents late click',()=>{
 const p=scenario({ageMs:30000});p.run();assert.deepEqual(p.clicks,[]);
 assert.equal(p.c.payArmed,false);
});
test('manual checkout mode does not click when no PayApp handoff opt-in',()=>{
 const p=scenario({auto:false});p.run();assert.deepEqual(p.clicks,[]);
 assert.equal(p.c.payDone,true);
});
test('background/cart action does not interact with external PayApp approval interface',()=>{
 assert.match(isolated,/\[data-act="pay-card"\]/);
 assert.doesNotMatch(isolated,/payApp\.submit|window\.open\(/i);
 assert.doesNotMatch(isolated,/checkout\.submit|payapp.*?\.click/ig);
});
