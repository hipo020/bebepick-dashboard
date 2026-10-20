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
 var timingOnce=()=>{},timingMark=()=>{},timingStart=()=>{},timingStop=()=>{},timingRound=()=>{},timingRpc=()=>{};
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

test('sold-out catalog item stays selectable, and missing SKU remains as waiting choice',()=>{
 const code=section(' function validSku(', ' async function loadCatalog(');
 const make=new Function('d',String.raw`
 const STORE='main',sku=d.sku,option='single',catalog=d.products;
 const labels={single:'낱개',fullbox:'풀박스'};
 const controls={search:{value:d.search||''},sku:{children:[],_v:'',replaceChildren(){this.children=[];this._v=''},append(x){this.children.push(x)},get value(){return this._v},set value(v){this._v=this.children.some(x=>x.value===v)?v:''}},
  opt:{querySelector(){return {disabled:false}}},product:{textContent:''}};
 const document={createElement(){return {value:'',textContent:''}}};
 const availableHere=p=>!p.only||p.only==='main',target=()=>catalog.find(p=>p.sku===sku),allowedOption=()=>true,
 saleable=p=>p&&(p.stock==='low'||p.stock===null),label=p=>p.name+' · '+p.sku,money=n=>String(n),savePref=()=>{};
 `+code+'fillCatalog();return {value:controls.sku.value,options:controls.sku.children,validSku};');
 const sold=make({products:[{sku:'D796',name:'밤토끼',stock:'out'}],sku:'D796'});
 assert.equal(sold.value,'D796');
 assert.ok(sold.options.some(o=>o.value==='D796'&&o.textContent.includes('품절')));
 const absent=make({products:[],sku:'D796'});
 assert.equal(absent.value,'D796');
 assert.ok(absent.options.some(o=>o.value==='D796'&&o.textContent.includes('코드 대기')));
 const spaced=make({products:[{sku:'D796',name:'밤토끼',stock:'out'}],sku:'D796',search:'밤 토 끼'});
 assert.equal(spaced.value,'D796');
 assert.equal(absent.validSku('D796'),true);
 assert.equal(absent.validSku('<script>'),false);
});
test('polling keeps sold-out settings without modifying cart until stock and window are ready',async()=>{
 const code=section(' async function poll()', ' function reloadShow()');
 const make=new Function('d',String.raw`
 const STORE='main',sku='D796',cycle=8,document={hidden:false};
 let cartPrepared=!!d.prepared,awaitingCatalog=!cartPrepared,active=true,polling=false,confirmed=false,tries=0,triggerMode='',confirmedAt=0,catalog=[],messages=[],prepareCalls=0,handoffCalls=0,scheduleCalls=[];
 const rpc=async name=>name==='order_windows'?{main:d.window||{open:true,yt_live:false}}:d.products;
 const target=()=>catalog.find(p=>p.sku===sku),expected=()=>true,stop=()=>{active=false},message=s=>messages.push(s),schedule=n=>scheduleCalls.push(n);
 const allowedOption=()=>true,saleable=p=>p.stock===null||p.stock==='low';
 const prepare=async()=>{prepareCalls++;return true},fillCatalog=()=>{},updateInfo=()=>{},handoff=()=>{handoffCalls++};
 const serverOpen=w=>w&&(w.open===true||w.yt_live===true),openMode=w=>w.open===true?'주문 접수':w.yt_live?'LIVE 표시':'';
 const timingOnce=()=>{},timingMark=()=>{},timingRound=()=>{};
 const latestAvailability=p=>saleable(p)?'판매 가능':'품절';
 `+code+'return {run:poll,stats:()=>({cartPrepared,awaitingCatalog,prepareCalls,handoffCalls,scheduleCalls})};');
 for(const [data,prep,hand] of [
  [{products:[]},0,0],
  [{products:[{sku:'D796',stock:'out'}]},0,0],
  [{products:[{sku:'D796',stock:'low'}],window:{open:false,yt_live:false}},1,0],
  [{products:[{sku:'D796',stock:'low'}]},1,1],
  [{products:[],prepared:true},0,0]
 ]){
  const x=make(data);await x.run();const s=x.stats();
  assert.equal(s.prepareCalls,prep);assert.equal(s.handoffCalls,hand);
  if(!s.handoffCalls)assert.ok(s.scheduleCalls.length>0);
 }
});
