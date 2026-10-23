'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const start = source.indexOf('controls.exportAndroid.onclick=');
const end = source.indexOf('controls.importCart.onclick=',start);
const snippet = source.slice(start,end);

test('one-tap Android transfer appears in fully rendered bookmarklet',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(source,/id="qExportAndroid"/);
 assert.match(source,/exportAndroid:el\('#qExportAndroid',panel\)/);
 assert.match(source,/갤럭시 앱으로 인형 목록 한 번에 보내기/);
});

test('native Android URI is created only on direct user click',()=>{
 assert.match(snippet,/controls\.exportAndroid\.onclick=\(\)=>/);
 assert.match(snippet,/intent:\/\/import\/plan\?data=/);
 assert.match(snippet,/encodeURIComponent\(data\)/);
 assert.match(snippet,/scheme=bebepickorder;package=com\.hipo\.bebepickorder;end/);
 assert.match(snippet,/window\.location\.href=url/);
});

test('bridge sends item list, quantity and names, never payment or address',()=>{
 assert.match(snippet,/kind:'bebepick-shop-watch-plan-v1'/);
 assert.match(snippet,/items:baseline/);
 assert.match(snippet,/readCart\(\)\.filter\(belongs\)/);
 assert.match(snippet,/nameCandidates:nameCandidates\.map/);
 assert.match(snippet,/store:STORE,watchMode:mode,cycle,open,storage/);
 const executable=snippet.replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(executable,/creditCard|address|localStorage|authorization|access_token|sessionStorage|CART_KEY|payapp|checkout\.click/);
});

test('mixed mode fails closed if missing one of both source lists',()=>{
 assert.match(snippet,/mode==='mixed'&&\(!payload\.items\.length\|\|!payload\.nameCandidates\.length\)/);
 assert.match(snippet,/if\(data\.length>14000\)/);
 assert.match(snippet,/new Set\(converted\.map\(itemKey\)\)\.size===converted\.length/);
});
