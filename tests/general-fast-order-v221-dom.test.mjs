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
