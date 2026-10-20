import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../bebepick-quick-order-general-v2.js',import.meta.url),'utf8');
function section(start,end) {
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'extract source section');
 return source.slice(i,j);
}
function mock(c={}) {
 const impl=section(' function abortWizard(', " document.addEventListener('click',e=>{");
 const harness=String.raw`
 var STORE='main',sku='D791',option='single',storage='보관',open='개봉',autoOrder=true,submitClicked=false,wizardTimer=1,wizardStage=0,wizardStart=Date.now(),dryRun=!!c.dry,finalAgreeAt=0,payArmed=false,payDone=false,autoPay=true,payDeadline=0,oldPayOrder='';
 var clicks={next:0,submit:0,pay:0},messages=[],step=0,document={hidden:!!c.hidden};
 var next={disabled:false,click(){step=1;clicks.next++;}},ok={disabled:false,isConnected:true,click(){clicks.submit++;}},
 all={checked:false,dispatchEvent(){}},checks=['storage','open'].map(k=>({checked:false,getAttribute:()=>k,dispatchEvent(){}}));
 var box={isConnected:true,querySelector(sel){
  if(sel==='#ocConv')return c.convert?{}:null;
  if(sel==='#ocConv2'||sel==='[data-oc-agree="convert"]')return null;
  if(sel==='#ocStorage')return step===0?{textContent:c.badStorage?'발송':'보관'}:null;
  if(sel==='#ocOpen')return step===0?{textContent:c.badOpen?'미개봉':'개봉'}:null;
  if(sel==='[data-oc="next"]')return step===0?next:null;
  if(sel==='#ocStorage2')return step===1?{textContent:c.badFinalStorage?'발송':'보관'}:null;
  if(sel==='#ocOpen2')return step===1?{textContent:'개봉'}:null;
  if(sel==='[data-oc="ok"]')return step===1?ok:null;
  if(sel==='#ocAll')return step===1?all:null;
  return null;
 },querySelectorAll(){return checks;}};
 var paySheet={isConnected:true,hidden:!!c.hiddenPay,textContent:c.payText||'',querySelector(){return {disabled:false,isConnected:true,textContent:'결제하기',click(){clicks.pay++;}}}};
 var el=s=>s==='.oc[role="alertdialog"] .oc-box'?box:s==='.panel[data-sheet="pay"]'?(c.noPay?null:paySheet):null;
 var expected=()=>!c.badCart,recentSubmit=()=>c.duplicate?{at:Date.now()}:null;
 var matchesStorage=t=>String(t).trim()==='보관',message=t=>messages.push(t),clearInterval=()=>{},setTimeout=()=>{},getComputedStyle=()=>({display:'block'});
 var sessionStorage={setItem(){}},Event=class{constructor(){}};
 `;
 return new Function('c',harness+impl+'return {tick:watchWizard,pay:watchPay,arm:()=>{payArmed=true;payDeadline=Date.now()+30000},clicks,messages};')(c);
}
test('source parses, options are variable, and dry-run is enabled by default',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(source,/id="qDryRun" checked/);
 assert.match(source,/list_products.*p_brand:STORE/);
 assert.doesNotMatch(source,/rpc\(['"]create_orders/);
 assert.doesNotMatch(source,/rpc\(['"]payapp_start/);
});
test('OR signal accepts either official order open or site LIVE flag',()=>{
 const fn=source.match(/function serverOpen\(w\)\{[^\n]+\}/)?.[0];
 assert.ok(fn);
 const ready=new Function(fn+'return serverOpen;')();
 for(const [input,result] of [
  [{open:true},true],[{open:false,yt_live:true},true],
  [{open:false,yt_live:false},false],
  [{open:true,closed:true,yt_live:false},false],
  [{yt_live:true,reason:'paused'},false]
 ])assert.equal(ready(input),result);
});
test('mocked confirmation performs zero final clicks in dry-run',()=>{
 const x=mock({dry:true});for(let i=0;i<4;i++)x.tick();
 assert.equal(x.clicks.next,1);assert.equal(x.clicks.submit,0);
 assert.ok(x.messages.some(s=>s.includes('무전송 시험 성공')));
});
test('mocked confirmation performs a single final click in real mode',()=>{
 const x=mock();for(let i=0;i<5;i++)x.tick();
 assert.equal(x.clicks.next,1);assert.equal(x.clicks.submit,1);
});
for(const [label,param,word] of [
 ['conversion warning',{convert:true},'보관/발송 변경'],
 ['wrong first option',{badOpen:true},'불일치'],
 ['wrong final option',{badFinalStorage:true},'불일치'],
 ['background',{hidden:true},'백그라운드'],
 ['duplicate submission',{duplicate:true},'중복 주문'],
 ['changed cart',{badCart:true},'장바구니']
]){
 test('mocked safety stop: '+label,()=>{
  const x=mock(param);for(let i=0;i<4;i++)x.tick();
  assert.equal(x.clicks.submit,0);assert.ok(x.messages.some(s=>s.includes(word)));
 });
}
test('new order confirmation is required before PayApp opens once',()=>{
 for(const [c,expected] of [
  [{payText:'주문서를 만들었습니다 BP261019TEST'},1],
  [{payText:'주문서를 만들었습니다'},0],
  [{payText:'주문서를 만들었습니다 BP261019TEST',hiddenPay:true},0],
  [{payText:'주문서를 만들었습니다 BP261019TEST',noPay:true},0]
 ]){const x=mock(c);x.arm();x.pay();x.pay();assert.equal(x.clicks.pay,expected);}
});