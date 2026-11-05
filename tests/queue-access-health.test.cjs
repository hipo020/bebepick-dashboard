'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync(require('node:path').join(__dirname,'../queue.html'),'utf8');
test('queue page announces a vendor access outage prominently',()=>{
 assert.match(html,/id="queueHealthBanner"/);
 assert.match(html,/id="queueHealthTitle"/);
 assert.match(html,/순번표 접근 차단/);
 assert.match(html,/내 차례 ntfy는 지금 보장할 수 없어/);
 assert.match(html,/서버는 1분마다 접근을 다시 확인 중이야/);
});
test('queue screen never displays old queue positions as real-time values',()=>{
 assert.match(html,/setText\("currentNumber",fresh&&row\.current_position/);
 assert.match(html,/setText\("totalNumber",fresh\?fmt\(row\.queue_length\):"—"\)/);
 assert.match(html,/실시간 순번 확인 중단 · 지난 기록만 표시/);
 assert.match(html,/renderTimeline\(row\);renderEstimate\(\);return;/);
 assert.match(html,/row\.monitoring_recent\?" · 순번 진행":" · 과거 순번 기록"/);
});
test('blocked vendor queue is not fetched repeatedly from browser',()=>{
 assert.match(html,/if\(data\.monitor\?\.status==="ok"\)\{/);
 assert.match(html,/nickFetchError=data\.monitor\?\.status==="restricted"/);
 assert.match(html,/const data=await response\.json\(\)/);
});
test('page inline javascript still parses',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 assert.ok(scripts.length>0);
 for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script));
});
