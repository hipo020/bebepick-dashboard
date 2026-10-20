import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../bebepick-quick-order-general-v23.js",import.meta.url),"utf8");
function between(start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"missing "+start);return src.slice(a,b);
}
function cartMatches(){
 const snippet=between("function cartMatches(", "\n function availableHere");
 const readCart=()=>[];
 return new Function("normalized",snippet+"return cartMatches;")(c=>c.opt==="fullbox"?"fullbox":"single");
}
test("v2.3 JS parses and is separate from stable v2.2.1",()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.match(src,/bbp_general_v23_watches_/);
 assert.match(src,/__bbpGeneralQuickV23/);
 assert.match(src,/MAX_WATCH=10/);
});
test("multi-cart equality is independent of SKU order and rejects extra lines or wrong options",()=>{
 const eq=cartMatches();
 const wanted=[{sku:"D811",option:"single",qty:1},{sku:"D796",option:"fullbox",qty:1}];
 const stored=[{sku:"D796",opt:"fullbox",qty:1},{sku:"D811",opt:"single",qty:1}];
 assert.equal(eq(stored,wanted),true);
 assert.equal(eq(stored.concat([{sku:"OTHER",opt:"single",qty:1}]),wanted),false);
 assert.equal(eq([{sku:"D796",opt:"single",qty:1},{sku:"D811",opt:"single",qty:1}],wanted),false);
});
test("saleable subset ignores sold-out dolls and unsupported fullboxes",()=>{
 const snippet=between("function saleableFor(", "\n function label(p)");
 const catalog=[
  {sku:"D811",only:"china",stock:"low",has_fullbox:false},
  {sku:"D796",only:"china",stock:"out",has_fullbox:false},
  {sku:"OTHER",only:"main",stock:"low",has_fullbox:false}
 ];
 const watched=[{sku:"D811",option:"single",qty:1},{sku:"D796",option:"single",qty:1},{sku:"OTHER",option:"single",qty:1}];
 const eligible=new Function("catalog","watchItems","STORE","availableHere","allowedOption",snippet+"return eligibleNow();")(
  catalog,watched,"china",p=>!p.only||p.only==="china",(p,opt)=>opt==="single"||!!p.has_fullbox
 );
 assert.deepEqual(eligible.map(x=>x.sku),["D811"]);
});
test("poll sends same two safe RPCs regardless of number of watched dolls",()=>{
 const block=between("async function poll(){","\n function reloadShow(){");
 assert.match(block,/Promise\.allSettled\(\[rpc\('order_windows',\{\}\),rpc\('list_products',\{p_brand:STORE\}\)\]\)/);
 assert.match(block,/eligible=eligibleNow\(\)/);
 assert.match(block,/if\(windowOk&&eligible\.length\)/);
 assert.match(block,/armedItems=eligible\.map\(x=>\(\{\.\.\.x\}\)\)/);
 assert.match(block,/if\(!await prepare\(\)\)/);
 assert.doesNotMatch(block,/create_orders|payapp_start/);
});
test("pre-order cart replacement requires consent and only touches matching store",()=>{
 const block=between("async function prepare(){","\n function prefill(){");
 assert.match(block,/if\(existing\.length&&!cartReplaceConsent\)/);
 assert.match(block,/original\.filter\(x=>!belongs\(x\)\)/);
 assert.match(block,/armedItems\.every\(w=>saleableFor\(productFor\(w\),w\.option\)\)/);
 assert.match(src,/if\(!confirm\('⚠ 여러 상품 실제 자동주문 동의/);
 assert.match(src,/cartReplaceConsent=confirm\('⚠ 공식 장바구니/);
 assert.match(src,/if\(recentSubmit\(\)\)/);
});
test("handoff validates every selected product and one final submit click",()=>{
 const block=between("function handoff(){","\n controls.reload.onclick");
 assert.match(block,/armedItems\.every\(row=>/);
 assert.match(block,/!card\.classList\.contains\('soldout'\)/);
 assert.match(block,/if\(!expected\(\)\)/);
 assert.match(src,/if\(dryRun\)\{timingOnce\('dry_run_stop'/);
 assert.match(src,/submitClicked=true/);
 assert.match(src,/ok\.click\(\)/);
});
test("official checkout scrolled into view while overlay folds and remains reopenable",()=>{
 assert.match(src,/function foldForOfficial\(\)/);
 assert.match(src,/panel\.style\.display='none'/);
 assert.match(src,/mini\.onclick=\(\)=>/);
 assert.match(src,/target\.scrollIntoView\(\{block:'end'/);
 assert.match(src,/if\(folded\)revealOfficialStage\(\)/);
 assert.doesNotMatch(between("function revealOfficialStage(){","\n function stop(){"),/\.click\(/);
});


function prepHarness(initial,requested,{consent=true,available=true}={}){
 let saved=JSON.parse(JSON.stringify(initial)),writes=0;
 const messages=[];
 const factory=between("async function prepare(){","\n function prefill(){");
 const eq=cartMatches(),belongs=x=>(x.store==="china"?"china":"main")==="china";
 const fn=new Function(
  "armedItems","cartReplaceConsent","initialCartSignature","cartSignature","STORE","CART_KEY","readCart","belongs","cartMatches","saleableFor","productFor","message","localStorage","window","StorageEvent","expected","prefill",
  factory+"return prepare;"
 );
 const prepare=fn(
  requested,consent,initial.filter(belongs).map(x=>[x.sku,(x.opt==='fullbox'?'fullbox':'single'),Number(x.qty),x.lid||''].join('|')).sort().join(';'),
  list=>list.map(x=>[x.sku,(x.opt==='fullbox'?'fullbox':'single'),Number(x.qty),x.lid||''].join('|')).sort().join(';'),
  "china","bbp_cart_v1",()=>saved,belongs,eq,
  ()=>available,()=>({stock:"low"}),message=>messages.push(message),
  {setItem:(key,value)=>{assert.equal(key,"bbp_cart_v1");writes++;saved=JSON.parse(value)}},
  {dispatchEvent:()=>{}},class StorageEvent{constructor(){}},
  ()=>eq(saved.filter(belongs),requested),()=>true
 );
 return {prepare,current:()=>saved,writes:()=>writes,messages};
}
test("two eligible dolls create exactly one same-store cart and preserve other store",async()=>{
 const desired=[{sku:"D811",option:"single",qty:1},{sku:"D796",option:"single",qty:1}];
 const trial=prepHarness([{sku:"MAIN1",opt:"single",qty:1,store:"main"},
  {sku:"OLD",opt:"single",qty:1,store:"china"}],desired);
 assert.equal(await trial.prepare(),true);
 assert.equal(trial.writes(),1);
 assert.deepEqual(trial.current().filter(x=>x.store==="main").map(x=>x.sku),["MAIN1"]);
 assert.deepEqual(trial.current().filter(x=>x.store==="china").map(x=>x.sku),["D811","D796"]);
});
test("declining cart replacement consent prevents all cart modifications",async()=>{
 const trial=prepHarness([{sku:"OLD",opt:"single",qty:1,store:"china"}],
  [{sku:"D811",option:"single",qty:1}],{consent:false});
 assert.equal(await trial.prepare(),false);
 assert.equal(trial.writes(),0);
 assert.equal(trial.current()[0].sku,"OLD");
});
test("any item no longer sellable causes cart preparation to stop",async()=>{
 const trial=prepHarness([],[{sku:"D811",option:"single",qty:1}],{available:false});
 assert.equal(await trial.prepare(),false);
 assert.equal(trial.writes(),0);
});

test("unexpected item added to cart after arming blocks every automatic write",async()=>{
 const original=[];
 const trial=prepHarness(original,[{sku:"D811",option:"single",qty:1}]);
 trial.current().push({sku:"UNRELATED",opt:"single",qty:1,store:"china"});
 assert.equal(await trial.prepare(),false);
 assert.equal(trial.writes(),0);
 assert.equal(trial.current()[0].sku,"UNRELATED");
});
