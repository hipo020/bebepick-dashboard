import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../rabbit-d796-fast-v5.js',import.meta.url),'utf8');
function sourceBetween(start,end) {
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'test extraction markers exist');
 return source.slice(a,b);
}
const eligibility=new Function(source.match(/function windowReady\\(w\\)\\{[^\\n]*\\}/)[0]+'return windowReady;')();
test('purchase is a LIVE OR manual-open candidate; official UI is still required',()=>{
 for (const [input,expect] of [
 [{open:true},true],[{open:false,yt_live:true},true],
 [{open:false,yt_live:true,closed:true},true],
 [{open:false,yt_live:true,enabled:false},true],
 [{open:false,yt_live:false},false],
 [{open:true,closed:true},false],
 [{open:false,yt_live:true,reason:'paused'},false]
 ])assert.equal(eligibility(input),expect);
});
test('dry run is opt-out and direct order RPC calls are absent',()=>{
 assert.match(source,/id="rbDryRun" checked/);
 assert.doesNotMatch(source,/rpcRead\\(['"]create_orders/);
 assert.doesNotMatch(source,/rpcRead\\(['"]payapp_start/);
 assert.doesNotMatch(source,/\\},900\\);/);
});
function wizard(scope={}){
 const body=sourceBetween(' function abortWizard(', ' function refreshRoute(');
 const make=new Function('scope',`
 var wizardTimer=1,payArmed=false,payRequested=false,wizardStage=0,autoOrder=true,submitClicked=false,wizardStart=Date.now(),dryRun=!!scope.dry,finalAgreeAt=0,document={hidden:!!scope.hidden},payArmedUntil=0,payDone=false,autoPay=true,knownPayOrder='',SKU='D796',selectedOpt='single';
 var statuses=[],clicks={next:0,ok:0},stage=0;
 var next={disabled:false,click(){clicks.next++;stage=1;}},ok={disabled:false,isConnected:true,click(){clicks.ok++;}};
 var all={checked:false,dispatchEvent(){}};
 var consent=['storage','open'].map(kind=>({checked:false,getAttribute:()=>kind,dispatchEvent(){}}));
 var box={isConnected:true,querySelector(q){
  if(q==='#ocConv')return scope.convert?{}:null;
  if(q==='#ocConv2'||q==='[data-oc-agree="convert"]')return null;
  if(q==='#ocStorage')return stage===0?{textContent:scope.wrong?'발송':'보관'}:null;
  if(q==='#ocOpen')return stage===0?{textContent:'개봉'}:null;
  if(q==='[data-oc="next"]')return stage===0?next:null;
  if(q==='#ocStorage2')return stage===1?{textContent:'보관'}:null;
  if(q==='#ocOpen2')return stage===1?{textContent:'개봉'}:null;
  if(q==='[data-oc="ok"]')return stage===1?ok:null;
  if(q==='#ocAll')return stage===1?all:null;
  return null;},
 querySelectorAll(q){return q==='[data-oc-agree]'?consent:[];}};
 var el=q=>q==='.oc[role="alertdialog"] .oc-box'?box:null;
 var preflight=()=>true,status=t=>statuses.push(t),watchPay=()=>{},clearInterval=()=>{},setTimeout=()=>{},sessionStorage={setItem(){}},Event=class{constructor(){}};
 ${body}
 return {tick:watchWizard,clicks,statuses};
 `);
 const instance=make(scope);
 for(let i=0;i<4;i++)instance.tick();
 return instance;
}
test('mock DOM: zero final clicks in dry run',()=>{
 const x=wizard({dry:true});assert.equal(x.clicks.next,1);assert.equal(x.clicks.ok,0);
 assert.ok(x.statuses.some(s=>s.includes('무전송 시험 성공')));
});
test('mock DOM: real mode calls final button only once',()=>{
 const x=wizard({dry:false});assert.equal(x.clicks.next,1);assert.equal(x.clicks.ok,1);
});
for(const [label,opts,fragment] of [
 ['conversion warning',{convert:true},'다른 주문'],['option mismatch',{wrong:true},'불일치'],['background',{hidden:true},'백그라운드']]){
 test('mock DOM blocks '+label,()=>{
  const x=wizard(opts);assert.equal(x.clicks.ok,0);
  assert.ok(x.statuses.some(s=>s.includes(fragment)));
 });
}
test('PayApp is opened only on new order confirmation',()=>{
 const body=sourceBetween(' function watchPay(){',' // 서버 공식 읽기 전용 RPC');
 const make=new Function('param',`
 var payArmed=true,payDone=false,payArmedUntil=Date.now()+30000,knownPayOrder=param.old||'',statuses=[],clicks=0;
 var sheet={isConnected:true,hidden:!!param.hidden,textContent:param.text||'',querySelector(){return {disabled:false,isConnected:true,textContent:'결제하기',click(){clicks++;}}}};
 var el=q=>param.sheet===false?null:sheet,getComputedStyle=()=>({display:param.display||'block'}),status=s=>statuses.push(s);
 ${body}
 return {run:watchPay,get clicks(){return clicks}};
 `);
 for(const [input,expected] of [
 [{text:'베베픽 주문서를 만들었습니다 BP261019DRYC'},1],
 [{text:'베베픽 주문서를 만들었습니다 BP261019DRYC',old:'BP261019DRYC'},0],
 [{text:'베베픽 주문서를 만들었습니다'},0],
 [{text:'베베픽 주문서를 만들었습니다 BP261019DRYC',hidden:true},0],
 [{text:'베베픽 주문서를 만들었습니다 BP261019DRYC',sheet:false},0]
 ]){const x=make(input);x.run();x.run();assert.equal(x.clicks,expected);}
});
