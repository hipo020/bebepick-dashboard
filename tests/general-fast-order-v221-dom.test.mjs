import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../bebepick-quick-order-general-v2.js",import.meta.url),"utf8");
const first=source.indexOf("  const cartWaitUntil=performance.now()+2500;");
const after=source.indexOf("\n }\n controls.reload.onclick",first);
assert.ok(first>0&&after>first,"cart progression block exists");
const fragment=source.slice(first,after);
test("in-browser cart fast path uses existing DOM observer plus fallback",()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(fragment,/cartTimer=setInterval\(progressCart,50\)/);
 assert.match(fragment,/queueMicrotask\(progressCart\)/);
 assert.match(source,/if\(cartTimer&&cartProgress\)cartProgress\(\)/);
 assert.match(fragment,/now-lastCartCheckAt<40/);
});
test("keeps official cart choice checks and safe no-order stages",()=>{
 assert.match(fragment,/if\(!correctOrderControls\(cartPanel\)\)/);
 assert.match(fragment,/if\(!next\|\|next.disabled\)/);
 assert.match(fragment,/if\(!expected\(\)\)/);
 assert.match(fragment,/next.click\(\)/);
 assert.doesNotMatch(fragment,/create_orders|payapp_start|fetch\(/);
 assert.match(source,/if\(dryRun\)\{timingOnce\('dry_run_stop'/);
 assert.match(source,/if\(recentSubmit\(\)\)/);
});
test("installer and version guard are distinct from v2.2 cache",()=>{
 assert.match(source,/version!=='2\.2\.1'/);
 assert.match(source,/version:'2\.2\.1'/);
});


function simulate(options={}){
 const ctx={now:0,ready:options.ready!==false,valid:options.valid!==false,expected:options.expected!==false,
  enabled:options.enabled!==false,clicks:0,records:[],messages:[],microtask:null,interval:null};
 const scope=`
 let cartTimer=null,cartProgress=null,wizardTimer=null,autoOrder=false,open='개봉',storage='보관';
 const performance={now:()=>ctx.now},el=(selector,root)=>{
  if(selector==='.panel[data-sheet="cart"]')return ctx.ready?{}:null;
  if(selector==='#checkout')return {disabled:!ctx.enabled,click(){ctx.clicks++}};
  return null;
 };
 const correctOrderControls=()=>ctx.valid,expected=()=>ctx.expected;
 const timingOnce=(...x)=>ctx.records.push(x),timingMark=(...x)=>ctx.records.push(x);
 const message=x=>ctx.messages.push(x);
 const setInterval=(fn,ms)=>{ctx.interval={fn,ms};return 1};
 const clearInterval=()=>{ctx.interval=null};
 const queueMicrotask=fn=>{ctx.microtask=fn};
 `;
 const obj=new Function('ctx',scope+fragment+'return {scan:()=>cartProgress?.(),tick:()=>ctx.interval?.fn(),flush:()=>ctx.microtask?.()};')(ctx);
 return {ctx,...obj};
}
test("immediately ready official cart advances once without the first 100ms timer",()=>{
 const {ctx,flush,tick}=simulate();
 assert.equal(ctx.interval.ms,50);
 flush();tick();tick();
 assert.equal(ctx.clicks,1);
 assert.equal(ctx.records.filter(e=>e[0]==='checkout_click').length,1);
});
test("a DOM mutation after cart appears advances immediately, not by repeat server RPC",()=>{
 const {ctx,flush,scan}=simulate({ready:false});
 flush();assert.equal(ctx.clicks,0);
 ctx.now=48;ctx.ready=true;scan();
 assert.equal(ctx.clicks,1);
});
test("incorrect cart or disabled checkout never trigger an order click",()=>{
 for(const options of [{expected:false},{valid:false},{enabled:false}]){
  const {ctx,flush}=simulate(options);flush();
  assert.equal(ctx.clicks,0);
 }
});
