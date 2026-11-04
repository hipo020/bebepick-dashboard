'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
test('embedded dashboard JavaScript remains syntactically valid',()=>{
 assert.ok(start>=0&&end>start);
 assert.doesNotThrow(()=>new vm.Script(html.slice(start+8,end)));
});
test('archived products remain visible as unverified and cannot trigger stale orders',()=>{
 assert.match(html,/sourceUnavailable = data\.source_unavailable === true/);
 assert.match(html,/sourceUnavailable && products\.length && filter === "new_site" && !newSiteProducts\.length/);
 assert.match(html,/filter = "all";/);
 assert.match(html,/if \(filter === "all"\) filter = "new_site";/);
 assert.match(html,/const availableCards = \[/);
 assert.match(html,/if \(sourceUnavailable \|\| p\?\.public_site\) return false/);
 assert.match(html,/if \(sourceUnavailable\) throw new Error\("공식 상품목록 확인 불가/);
 assert.match(html,/sourceUnavailable \? "—"/);
 assert.match(html,/sourceUnavailable \? "현재 상태 미확인"/);
 assert.match(html,/if \(!sourceUnavailable\) await hydrateClientStats\(\)/);
});
test('new-site public records have separate safe status and no invented stock quantities',()=>{
 assert.match(html,/data\.new_site\?\.fresh === true/);
 assert.match(html,/data-f="new_site"/);
 assert.match(html,/const memberOnlyProducts = \[\.\.\.memberPriceData\.values\(\)\]/);
 assert.match(html,/const publicCards = \[\.\.\.newSiteProducts, \.\.\.memberOnlyProducts\]\.map/);
 assert.match(html,/member_only: p\.member_only === true/);
 assert.match(html,/current_stock: null,/);
 assert.match(html,/price: Number\.isSafeInteger\(Number\(old\.price\)\)/);
 assert.match(html,/p\.public_stock === "low" \? "매진 임박"/);
 assert.match(html,/p\.public_stock === "out" \? "품절"/);
 assert.match(html,/공식 공개 목록 · 수량은 공개된 경우만 표시/);
 assert.match(html,/p\.public_site \? \(p\.public_stock === "out"/);
 assert.doesNotMatch(html,/fetch\(.+\/rpc\/create_orders/);
});
