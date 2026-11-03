'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const presets=fs.readFileSync(path.join(__dirname,'../stock-sort-presets.js'),'utf8');
test('official NEW is a badge in 판매중, never a separate tab or old pre-release estimate',()=>{
 assert.match(html, /data-f="available"/);
 assert.doesNotMatch(html, /data-f="new_products"/);
 assert.match(html, /👀 신상추정/);
 assert.match(html, /const publishedNotOut = publicCards\.filter\(p => p\.public_stock !== "out"\)/);
 assert.match(html, /const availableCards = \[/);
 assert.match(html, /filter === "available" \? availableCards/);
 assert.match(html, /p\.public_is_new \? "🆕 NEW"/);
 assert.match(html, /const legacyCandidates = sourceUnavailable \? \[\] : baseProducts\.filter\(isUpcomingTabCandidate\)/);
 assert.match(html, /filter === "upcoming" \? legacyCandidates/);
 assert.match(html, /const upcoming = legacyCandidates\.length/);
 assert.match(html, /공개 상품 포함 · 구매 가능 여부 미확인 항목 있음/);
 assert.match(html, /공개됨 · 구매 미확인/);
 assert.match(html, /예전 재고 원본이 끊겨 현재는 공개 전 재고 징후를 판단할 수 없어/);
 assert.match(html, /first_public_at: typeof p\.first_public_at === "string"/);
});
test('vendor disclosed left count is shown only if safe integer and stock not sold out',()=>{
 assert.match(html,/public_left: Number\.isSafeInteger\(p\.left\) && p\.left >= 1 && p\.left <= 99 \? p\.left : null/);
 assert.match(html,/p\.public_left !== null \? fmt\(p\.public_left\) \+ "개"/);
 assert.match(html,/p\.public_stock === "out" \? "품절"/);
 assert.match(html,/p\.public_last3 \? '<div class="meta">🧸 마지막 샘플 안내 표시/);
 assert.match(html,/if \(sourceUnavailable \|\| p\?\.public_site\) return false/);
 assert.doesNotMatch(html,/fetch\(.+\/rpc\/create_orders/);
});
test('observed-public sort is integrated without breaking full dashboard JS',()=>{
 assert.match(presets,/new_site: \[\["recent_public"/);
 assert.match(presets,/upcoming: \[\["recent_created"/);
 assert.match(html,/if \(sort === "recent_public"\)/);
 const open=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
 assert.doesNotThrow(()=>new vm.Script(html.slice(open+8,end)));
 assert.doesNotThrow(()=>new vm.Script(presets));
});
