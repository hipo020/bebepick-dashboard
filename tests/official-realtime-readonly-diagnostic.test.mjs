import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const js=readFileSync(new URL("../bebepick-official-realtime-readonly-diagnostic-v1.js",import.meta.url),"utf8");
test("diagnostic JavaScript parses and is limited to official /live and /plus",()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/location\.hostname/);
 assert.match(js,/validRoute/);
});
test("official order and cart RPC are never called, and no local shopping state is touched",()=>{
 assert.doesNotMatch(js,/rpc\/create_orders/);
 assert.doesNotMatch(js,/rpc\/payapp_start/);
 assert.doesNotMatch(js,/localStorage\.(getItem|setItem)/);
 assert.doesNotMatch(js,/sessionStorage\.(getItem|setItem)/);
 assert.doesNotMatch(js,/\.click\(\)/);
 assert.doesNotMatch(js,/location\.(assign|replace|reload)/);
});
test("network monitoring is passive, official app.js is fetched once only",()=>{
 assert.match(js,/PerformanceObserver/);
 assert.match(js,/MutationObserver/);
 assert.match(js,/cache:"force-cache"/);
 assert.match(js,/app\.js/);
 assert.match(js,/report\(\)/);
 assert.match(js,/navigator\.clipboard/);
 assert.doesNotMatch(js,/setInterval\s*\(/);
});
test("only safe known RPC endpoint names are recorded, no request bodies or keys",()=>{
 assert.match(js,/name==="list_products"\|\|name==="order_windows"/);
 assert.doesNotMatch(js,/access_token|Bearer|Authorization|APP_CONFIG/);
 assert.doesNotMatch(js,/JSON\.stringify\(.*responseBody/);
});
