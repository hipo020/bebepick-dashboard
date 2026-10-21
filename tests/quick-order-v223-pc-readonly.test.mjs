import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const js=readFileSync(new URL("../bebepick-pc-readonly-ui-diagnostic-v223.js",import.meta.url),"utf8");
const installer=readFileSync(new URL("../bebepick-pc-ui-diagnostic-v223-install.html",import.meta.url),"utf8");
function part(start,end){const a=js.indexOf(start),b=js.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return js.slice(a,b);}
test("separate diagnostic JavaScript syntax and exact supported official paths",()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/\bconst store=\/\^\\\/plus/);
 assert.match(js,/location\.hostname!=="bebepick\.me"/);
 assert.match(js,/window\.__bbpReadOnlyUiDiag223/);
});
test("only two documented read-only official RPCs; no create_orders or payment traffic",()=>{
 const poll=part("async function poll(){","function stop(){");
 assert.match(poll,/rpc\("order_windows",\{\},ctrl\)/);
 assert.match(poll,/if\(sku\)requested\.push\(rpc\("list_products",\{p_brand:store\},ctrl\)\)/);
 assert.doesNotMatch(js,/["'](?:create_orders|payapp_start|submit_order|checkout_order|set_stock|update_stock)["']/);
 assert.doesNotMatch(js,/\/functions\/v1\/|\/rest\/v1\/(?:orders|products)(?!\/rpc)/);
});
test("site cart, order, consent and payment UI are NEVER clicked or modified",()=>{
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem|removeItem\(|dispatchEvent\(/);
 assert.doesNotMatch(js,/\b(?:checkout|confirm|order|pay|cartButton|productButton|target)\.click\s*\(/);
 const click=js.match(/\b[a-zA-Z]+\.click\(\)/g)||[];
 assert.deepEqual(click,["a.click()"]); // Only downloadable JSON file anchor
 assert.match(js,/a\.download="bebepick-ui-diagnostic-v223-"/);
});
test("server OFF to ON and official UI changes recorded independently",()=>{
 assert.match(js,/lastServer===null\?"server_initial":"server_transition"/);
 assert.match(js,/logEvent\("official_dom_change"/);
 assert.match(js,/logEvent\("server_on_dom_closed"/);
 assert.match(js,/cartButton\.disabled\?"disabled":"enabled"/);
 assert.match(js,/getComputedStyle\(el\)/);
});
test("bounded requests and locally private metadata-only logs",()=>{
 assert.match(js,/new AbortController\(\)/);
 assert.match(js,/setTimeout\(\(\)=>ctrl\.abort\(\),7500\)/);
 assert.match(js,/if\(document\.hidden\)/);
 assert.match(js,/events\.length>250/);
 assert.match(js,/JSON\.stringify\(output\(\),null,2\)/);
 assert.doesNotMatch(part("function output(){","$(\"#dStart\").onclick"),/access_token|anon|headers|apikey|cookie|name|phone/);
});
test("PC installer uses unique bookmarked script and does not link live order as diagnostic",()=>{
 assert.match(installer,/bebepick-pc-readonly-ui-diagnostic-v223\.js\?v=20261021-v223-pc-readonly/);
 assert.match(installer,/Ctrl \+ Shift \+ O/);
 assert.match(installer,/Ctrl \+ D/);
 assert.match(installer,/진단 전용/);
 assert.doesNotMatch(installer,/<script src="https:\/\/bebepick\.me/);
});