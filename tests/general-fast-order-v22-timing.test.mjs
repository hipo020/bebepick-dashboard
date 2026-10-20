import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../bebepick-quick-order-general-v2.js",import.meta.url),"utf8");
function slice(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return source.slice(i,j)}
function harness(){
 const code=slice(" // Instrumentation only."," el('#qChannel',panel)");
 const scope=[
  "const STORE='china',sku='D796',option='single',cycle=8,autoOrder=true,dryRun=true,panel={};",
  "let fake=0;",
  "const performance={now:()=>fake};",
  "const controls={timingLog:{textContent:''},timingSummary:{textContent:''}};",
  "const sessionStorage={data:{},getItem(k){return this.data[k]||null},setItem(k,v){this.data[k]=v}};",
  "const el=()=>({onclick:null}),setTimeout=()=>99,clearTimeout=()=>{},message=()=>{};"
 ].join("\n");
 return new Function(scope+code+"return {start:timingStart,once:timingOnce,round:timingRound,rpc:timingRpc,stop:timingStop,report:timingReport,advance:n=>fake+=n,summary:()=>controls.timingSummary.textContent,stored:sessionStorage};")();
}
test("timing code parses and does not perform network/order calls",()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.doesNotMatch(slice(" // Instrumentation only."," el('#qChannel',panel)"),/fetch\(|rpc\(['"]|localStorage\.setItem/);
});
test("stock confirmation to checkout uses monotonic elapsed milliseconds",()=>{
 const t=harness();t.start();t.advance(100);t.once("sellable");t.advance(10);t.once("cart_ready");t.advance(230);t.once("checkout_click");
 const r=t.report(),stock=r.events.find(x=>x.event==="sellable"),checkout=r.events.find(x=>x.event==="checkout_click");
 assert.equal(r.kind,"bebepick-quick-order-timing-v22");
 assert.equal(r.mode,"무전송 자동 확인");
 assert.equal(stock.sinceSellableMs,0);
 assert.equal(checkout.sinceSellableMs,240);
 assert.equal(checkout.elapsedMs-stock.elapsedMs,240);
 assert.match(t.summary(),/240\.0ms/);
 t.once("sellable");assert.equal(t.report().events.filter(x=>x.event==="sellable").length,1);
});
test("RPC samples and safe local archive",()=>{
 const t=harness();t.start();t.rpc("list_products",44.6);t.rpc("order_windows",78.9);t.round(100,false);t.round(130,true);
 assert.equal(t.report().stats.checks,2);assert.equal(t.report().stats.errors,1);
 assert.equal(t.report().stats.rpc.list_products.lastMs,44.6);
 t.stop("user stopped");
 assert.equal(t.report().events.at(-1).event,"stopped");
 assert.ok(Object.keys(t.stored.data).some(k=>k.includes("timing_last")));
 assert.ok(!JSON.stringify(t.report()).includes("access_token"));
});
test("safety protections remain present",()=>{
 assert.match(source,/id="qDryRun" checked/);
 assert.match(source,/if\(recentSubmit\(\)\)/);
 assert.match(source,/timingOnce\('dry_run_stop'/);
 assert.doesNotMatch(source,/rpc\(['"]create_orders/);
});
