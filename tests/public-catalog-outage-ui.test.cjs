const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {Script}=require('node:vm');
const html=readFileSync(resolve(__dirname,'../new-site.html'),'utf8');

test('stock feed outage is a visible warning, not silently pending',()=>{
 assert.match(html,/id="catalogOutage"/);
 assert.match(html,/상품 감시 오류/);
 assert.match(html,/공개 상품 목록을 갱신하지 못하고 있어/);
 assert.match(html,/신상품·재입고·품절 알림을 보장할 수 없어/);
 assert.match(html,/last_catalog_ok_at/);
 assert.match(html,/현재 재고가 아니야/);
});
test('old windows records do not masquerade as current open status',()=>{
 assert.match(html,/s\.windows_result!=="ok" \|\| !w/);
 assert.match(html,/이전 열림\/닫힘 정보는 현재 상태가 아니야/);
});
test('front end retains read-only status requests and no vendor origin spoof',()=>{
 assert.doesNotMatch(html,/origin_rejected.*(?:Origin|Referer):/i);
 assert.doesNotMatch(html,/(?:Origin|Referer)\s*:/i);
 assert.doesNotMatch(html,/\b(?:Authorization|refresh_token|service_role)\s*[:=]/i);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 assert.ok(scripts.length>0);
 for(const src of scripts)assert.doesNotThrow(()=>new Script(src));
});
