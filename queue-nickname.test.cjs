'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ident=require('./queue-nickname.js');

function localStore(){
 const map=new Map();
 return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
test('nickname remains local, can be edited or cleared, and is never a global default',()=>{
 const storage=localStore();
 assert.equal(ident.read(storage),'');
 assert.equal(ident.save('  MyNick  ',storage),true);
 assert.equal(ident.read(storage),'MyNick');
 assert.equal(ident.save('새닉',storage),true);
 assert.equal(ident.read(storage),'새닉');
 assert.equal(ident.save('',storage),true);
 assert.equal(ident.read(storage),'');
});
test('nickname matching is exact (trim/case) and handles JSON queue payloads',()=>{
 const queue=[{nickname:'다른사람'},{nickname:'  HeeSoo '},{nickname:'HEESOO'},{nickname:'희수'}];
 const a=ident.match(JSON.stringify(queue),0,'heesoo');
 assert.deepEqual(a,{position:2,ahead:1,count:2,positions:[2,3],currentPosition:1});
 assert.equal(ident.match(queue,0,'희'),null);
});
test('multiple equal nicknames choose nearest unpassed turn, never first past turn',()=>{
 const queue=[{nickname:'A'},{nickname:'B'},{nickname:'A'},{nickname:'C'},{nickname:'A'}];
 const first=ident.match(queue,0,'A');
 const second=ident.match(queue,1,'A');
 const third=ident.match(queue,3,'A');
 const passed=ident.match(queue,6,'A');
 assert.equal(first.position,1);
 assert.equal(second.position,3);
 assert.equal(second.ahead,1);
 assert.equal(third.position,5);
 assert.equal(passed.position,5);
 assert.equal(passed.ahead,-2); // current_idx=6 is zero-based (7th), previous match was 5th
 assert.equal(first.count,3);
});
test('no queue data, malformed data and missing current index never invent a turn',()=>{
 assert.equal(ident.match('not JSON',0,'a'),null);
 assert.equal(ident.match(null,0,'a'),null);
 assert.equal(ident.match([{nickname:'a'}],0,'another'),null);
 assert.equal(ident.match([{nickname:'a'}],0,''),null);
 assert.equal(ident.match([{nickname:'a'}],null,'a').ahead,null);
});
test('queue and inventory pages parse, share preference, and avoid upload/submit',()=>{
 const html=fs.readFileSync(path.join(__dirname,'queue.html'),'utf8');
 const index=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 assert.match(html,/id="myNickname"/);
 assert.match(html,/id="saveNickname"/);
 assert.match(html,/id="autoPosition"/);
 assert.match(html,/queue-nickname\.js/);
 assert.match(index,/queue-nickname\.js/);
 assert.match(index,/BebepickQueueIdentity\.read\(\)/);
 assert.doesNotMatch(index,/const QUEUE_NICKNAME\s*=/);
 assert.match(html,/BebepickQueueIdentity\.match\(live\.queue_data,live\.current_idx,nickname\)/);
 assert.match(html,/String\(x\.broadcast_id\)===String\(row\.broadcast_id\)/);
 assert.match(html,/setInterval\(\(\)=>\{if\(!document\.hidden\)refresh\(\)/);
 assert.doesNotMatch(html,/\.insert\(|\.upsert\(|\.update\(|\.delete\(|create_orders|rpc\(/);
 const scripts=html.match(/<script>([\s\S]*?)<\/script>/g)||[];
 assert.equal(scripts.length,1);
 new vm.Script(scripts[0].slice(8,-9));
 const indexScripts=index.match(/<script>([\s\S]*?)<\/script>/g)||[];
 assert.ok(indexScripts.length>=1);
 for(const snippet of indexScripts)new vm.Script(snippet.slice(8,-9));
});
