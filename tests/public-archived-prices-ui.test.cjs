'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('public cards reuse archived prices only with explicitly historical labels',()=>{
 assert.match(html,/price: Number\.isSafeInteger\(Number\(old\.price\)\)/);
 assert.match(html,/fullbox_price: Number\.isSafeInteger\(Number\(old\.fullbox_price\)\)/);
 assert.match(html,/archived_price_only: true/);
 assert.match(html,/"이전 가격 " \+ fmt\(p\.price\)/);
 assert.match(html,/p\.public_site \? " · 이전 풀박스 "/);
 assert.match(html,/"가격 확인 필요"/);
 assert.match(html,/current_stock: null/);
 assert.match(html,/if \(sourceUnavailable \|\| p\?\.public_site\) return false/);
});
test('published cards use compact original-list styling with inline NEW and status caveat',()=>{
 assert.match(html,/class="card' \+ \(p\.public_site \? ' public-item'/);
 assert.match(html,/esc\(p\.name\) \+ publicTag/);
 assert.match(html,/\.public-card-tag\{/);
 assert.match(html,/\.public-item \.archived-price\{/);
 assert.match(html,/\.public-item \.stock\{/);
 assert.match(html,/구매·수량 미확인/);
 assert.match(html,/p\.public_is_new \? "🆕 NEW · "/);
 const start=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
 assert.ok(start>=0&&end>start);
 assert.doesNotThrow(()=>new vm.Script(html.slice(start+8,end)));
});
