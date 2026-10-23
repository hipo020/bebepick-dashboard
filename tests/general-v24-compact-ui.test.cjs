'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const htmlExpr=source.slice(source.indexOf('panel.innerHTML='),source.indexOf('document.body.appendChild(panel);'));
const html=new Function("const panel={innerHTML:''};const inputStyle='width:100%';const rowStyle='display:flex';"+htmlExpr+";return panel.innerHTML")();
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('updated bookmarklet syntax and full panel markup are valid',()=>{
 assert.doesNotThrow(()=>new Function(source));
 const stack=[];
 for(const m of html.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9-]*)\b[^>]*>/gi)){
  const t=m[2].toLowerCase();
  if(['input','img','br','hr','link','meta'].includes(t))continue;
  if(m[1])assert.equal(stack.pop(),t,'markup tag mismatch near '+m.index);
  else stack.push(t);
 }
 assert.deepEqual(stack,[]);
 assert.deepEqual(ids.filter((n,i)=>ids.indexOf(n)!==i),[]);
});
test('1-4 seconds are available and 60 second option is gone while 8 second default remains',()=>{
 assert.match(source,/const allowed=\[1,2,3,4,5,8,10,15,30\]/);
 for(const i of [1,2,3,4,5,8,10,15,30])assert.match(html,new RegExp('option value="'+i+'"'));
 assert.doesNotMatch(html,/option value="60"/);
 assert.match(source,/let cycle=allowed\.includes\(\+pref\.cycle\).*:8/);
 assert.match(source,/if\(cycle<=2&&!confirm\(/);
 assert.match(source,/failed\.some\(e=>e&&e\.httpStatus===429\)\?60000/);
 assert.match(source,/schedule\(cycle\*1000\)/);
});
test('most advanced actions are folded and primary monitoring state is always visible',()=>{
 for(const id of ['qDeviceImport','qManualDetails','qOrderOptions','qPcOptions','qNameEditor','qSkuEditor'])
  assert.match(html,new RegExp('<details id="'+id+'"'));
 for(const id of ['qQuantitySummary','qSafetyMode','qModeStatus','qStatus','qCycle','qStart','qStop','qLoad'])
  assert.ok(ids.includes(id),'missing '+id);
 assert.match(html,/id="qOrderOptions"/);
 assert.match(source,/updateSafetyLabel\(\)/);
 assert.match(source,/controls\.safetyMode\.textContent=real/);
});
test('existing product and ordering gates are intact',()=>{
 for(const id of ['qNameQty','qNameOpt','qAddName','qQty','qOpt','qUseSku','qImportCart','qExportAndroid','qAutoOrder','qDryRun','qPayAppPage','qBackgroundWatch'])
  assert.ok(ids.includes(id),'missing '+id);
 assert.match(html,/id="qDryRun" checked/);
 assert.doesNotMatch(html,/id="qPayAppPage" checked/);
 assert.match(source,/if\(autoOrder&&!dryRun\)/);
 assert.match(source,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(source,/payArmed=autoPay&&!dryRun/);
});
test('mixed-mode top summary does not incorrectly say SKU-only',()=>{
 assert.match(source,/current==='mixed'\?'\\n✅ 통합 모드/);
 assert.match(source,/controls\.nameEditor\.open=names\|\|\(current==='mixed'&&!nameCandidates\.length\)/);
});
