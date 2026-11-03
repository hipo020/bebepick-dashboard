'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const presets=fs.readFileSync(path.join(__dirname,'../stock-sort-presets.js'),'utf8');
test('new site candidate tab uses observed public flags, not hidden stock guesses',()=>{
 assert.match(html,/👀 신상 후보/);
 assert.match(html,/p\.public_is_new === true/);
 assert.match(html,/candidateNow - Date\.parse\(p\.first_public_at\) <= 72 \* 60 \* 60 \* 1000/);
 assert.match(html,/const publicCandidates = publicCards\.filter\(isPublicCandidate\)/);
 assert.match(html,/const legacyCandidates = sourceUnavailable \? \[\] : baseProducts\.filter\(isUpcomingTabCandidate\)/);
 assert.match(html,/미공개 신상품은 확인할 수 없음/);
 assert.match(html,/공개 후 관측 · 미공개 사전 감지 아님/);
 assert.match(html,/first_public_at: typeof p\.first_public_at === "string"/);
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
 assert.match(presets,/upcoming: \[\["recent_public"/);
 assert.match(html,/if \(sort === "recent_public"\)/);
 const open=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
 assert.doesNotThrow(()=>new vm.Script(html.slice(open+8,end)));
 assert.doesNotThrow(()=>new vm.Script(presets));
});
