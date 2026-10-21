import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../bebepick-quick-order-general-v222.js",import.meta.url),"utf8");
function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start+" not found");return source.slice(a,b);}

test("v2.2.2 syntax, isolated source and checkout overlay folding",()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(source,/version:'2\.2\.2'/);
 assert.match(source,/function foldOfficial\(\)/);
 assert.match(source,/mini\.onclick=\(\)=>/);
 assert.match(source,/target\.scrollIntoView\(\{block:'end'/);
 assert.match(source,/timingOnce\('cart_click'.*btn\.click\(\);\s*foldOfficial\(\)/);
});
test("closed-to-open transition is separately recorded from already-open at start",()=>{
 assert.match(source,/lastWindowOk===false\)timingOnce\('window_transition'/);
 assert.match(source,/lastWindowOk===null\)timingOnce\('window_closed'/);
 assert.match(source,/lastWindowOk=windowOk/);
 assert.match(source,/active=true;confirmed=false;completed=false;tries=0;triggerMode='';routeBusy=false;lastWindowOk=null/);
});
test("stale official UI waits bounded 5s and resumes original server polling",()=>{
 const handoff=part("function handoff(){","controls.reload.onclick");
 assert.match(handoff,/Date\.now\(\)-confirmedAt>=5000/);
 assert.match(handoff,/timingMark\('ui_stale'/);
 assert.match(handoff,/confirmed=false/);
 assert.match(handoff,/schedule\(cycle\*1000\)/);
 assert.match(source,/uiTimer=setInterval\(\(\)=>\{if\(confirmed&&active&&!polling&&!document\.hidden\)handoff\(\);\},250\)/);
 assert.match(source,/if\(uiTimer\)clearInterval\(uiTimer\)/);
 assert.doesNotMatch(handoff,/location\.reload\(|location\.assign\(/);
});
test("official UI not trusted until button and product actually enabled",()=>{
 const handoff=part("function handoff(){","controls.reload.onclick");
 assert.match(handoff,/!shopFresh/);
 assert.match(handoff,/if\(!btn\|\|btn\.disabled\)/);
 assert.match(handoff,/if\(!expected\(\)\)/);
 assert.match(handoff,/btn\.click\(\)/);
 assert.match(source,/if\(dryRun\)\{timingOnce\('dry_run_stop'/);
 assert.match(source,/if\(recentSubmit\(\)\)/);
 assert.doesNotMatch(source,/rpc\(['"]create_orders|rpc\(['"]payapp_start/);
});
test("no recursive observer on our own UI, scroll helper never submits anything",()=>{
 const observer=part("const ob=new MutationObserver(","ob.observe(document.body");
 assert.match(observer,/!panel\.contains\(r\.target\)&&!mini\.contains\(r\.target\)/);
 const scroll=part("function revealOfficial(){","function stop(){");
 assert.doesNotMatch(scroll,/\.click\(\)|rpc\(|fetch\(/);
 assert.match(source,/confirm\('공식 홈페이지를 새로고침할까/);
});
