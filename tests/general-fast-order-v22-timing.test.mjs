import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../bebepick-quick-order-general-v2.js",import.meta.url),"utf8");
function section(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"timing helpers exist");
 return source.slice(a,b);
}
function traceHarness(){
 const timingCode=section(" // Instrumentation only."," el('#qChannel',panel)");
 const scope=String.raw