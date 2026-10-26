'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const queueHtml=fs.readFileSync(path.join(__dirname,'..','queue.html'),'utf8');
const begin=html.indexOf('function queueTailInfo(row, summary, nowMs = Date.now())');
const end=html.indexOf('function queuePageUrl(slug)',begin);
assert.ok(begin>0&&end>begin);
const {queueTailInfo,queueTailLabel}=vm.runInNewContext(
 html.slice(begin,end)+'\n;({queueTailInfo,queueTailLabel})',
 {Date,Number,Math,JSON,String}
);
const NOW=Date.parse('2026-10-26T09:20:00Z');
const row=(mods={})=>({broadcast_id:15,channel_slug:'bebepick',current_idx:4,
 queue_data:Array.from({length:52},(_,i)=>({nickname:'test'+i})),...mods});
const snap=(mods={})=>({broadcast_id:15,channel_slug:'bebepick',current_idx:4,
 queue_length:52,observed_at:new Date(NOW-60000).toISOString(),seconds_per_person:90,...mods});
test('same tab links show the last one-based number and conservative time',()=>{
 const v=queueTailInfo(row(),snap(),NOW);
 assert.equal(v.last,52);
 assert.equal(v.kind,'estimated');
 assert.equal(v.remainingMinutes,72);
 assert.match(queueTailLabel(v),/마지막 52번/);
 assert.match(queueTailLabel(v),/1시간 12분/);
});
test('initial register is not mistaken for a 0-based last queue number',()=>{
 assert.equal(queueTailInfo(row({current_idx:0}),snap({current_idx:0}),NOW).last,52);
 assert.equal(queueTailInfo(row({current_idx:51}),snap({current_idx:51}),NOW).kind,'last_turn');
});
test('unknown or non-matching queue summary never invents ETA',()=>{
 for(const patch of [{seconds_per_person:null},{seconds_per_person:0},
  {broadcast_id:16},{channel_slug:'bebepick_plus'},{queue_length:45},
  {current_idx:3},{observed_at:new Date(NOW-11*60000).toISOString()},
  {observed_at:'not a date'}]){
  assert.notEqual(queueTailInfo(row(),snap(patch),NOW).kind,'estimated');
 }
 assert.equal(queueTailInfo(row({queue_data:'[]'}),snap(),NOW).kind,'unknown');
 assert.equal(queueTailInfo(row({current_idx:null}),snap(),NOW).kind,'not_started');
});
test('no ETA request when broadcast queue is empty; preserve official links',()=>{
 assert.match(html,/const etaRes = \(Array\.isArray\(queueRes\.data\) && queueRes\.data\.length\)/);
 assert.match(html,/queueTailInfo\(row, summary\)/);
 assert.match(html,/queue-tail/);
 assert.match(html,/queuePageUrl\(slug\)/);
});
test('detailed queue page reuses current math without extra polls',()=>{
 assert.match(queueHtml,/id="lastTurnMeta"/);
 assert.match(queueHtml,/BebepickQueueMath\.estimate\(row,last,Date\.now\(\)\)/);
 assert.match(queueHtml,/actual YouTube stream|실제 종료 시각/);
 assert.match(queueHtml,/durationStats=BebepickQueueMath\.recentDurationStats\(row\)/);
});
