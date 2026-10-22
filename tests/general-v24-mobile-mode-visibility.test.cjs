'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'bebepick-quick-order-general-v24.js'), 'utf8');
const part = (a,b) => {
 const start=src.indexOf(a),end=src.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,'Missing source section: '+a);
 return src.slice(start,end);
};
test('bookmarklet compiles',()=>assert.doesNotThrow(()=>new Function(src)));
test('SKU and name plans remain separate; none of the stored items are overwritten by rendering',()=>{
 const render=part('function renderBasket(){','function inspectNameCandidates(');
 assert.match(render,/const list=items\.slice\(\)/);
 assert.match(render,/browserCart=readCart\(\)\.filter\(belongs\)/);
 assert.match(render,/list\.forEach/);
 assert.match(render,/browserCart\.entries\(\)/);
 assert.doesNotMatch(render,/items\s*=|localStorage\.setItem|readCart\(\)\.splice/);
 assert.match(src,/return armedMode==='names'\?\(lockedCandidate\?/);
});
test('both setup sections have clear titles and display saved counts even in inactive mode',()=>{
 assert.match(src,/id="qNameEditor"/);
 assert.match(src,/id="qSkuEditor"/);
 assert.match(src,/id="qModeStatus"/);
 assert.match(src,/두 목록은 합쳐지지 않아/);
 assert.match(src,/도우미에 저장된 기존 SKU/);
 assert.match(src,/이 브라우저에 저장된 장바구니/);
 assert.match(src,/renderModeSections\(true\)/);
});
test('compact mobile layout retains visible mode, sticky title and action area',()=>{
 assert.match(src,/max-width:640px/);
 assert.match(src,/max-height:calc\(100dvh - 16px\)/);
 assert.match(src,/id="qActions"/);
 assert.match(src,/position:sticky;top:-12px/);
 assert.match(src,/position:sticky;bottom:-11px/);
});
test('no changes to real-order and no-submit gates',()=>{
 assert.match(src,/if\(autoOrder&&!dryRun\)/);
 assert.match(src,/if\(dryRun\)/);
 assert.match(src,/if\(!confirm\(realConsent\)\)return/);
});
