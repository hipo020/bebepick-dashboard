'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
function extract(name){const start=src.indexOf(' function '+name+'(){');const end=src.indexOf('\n }',start)+3;assert.ok(start>=0);return src.slice(start,end);}
function button(color){const values=new Map(color?[['color',color]]:[]);const priorities=new Map();return {style:{getPropertyValue:k=>values.get(k)||'',setProperty:(k,v,p)=>{values.set(k,v);priorities.set(k,p);}},values,priorities};}
test('host dark text is overridden while explicit primary button colors survive',()=>{
 const white=button('#fff'),plain=button(),buttons=[white,plain];
 const context={panel:{querySelectorAll:()=>buttons}};vm.createContext(context);
 vm.runInContext(extract('styleHelperButtons')+';styleHelperButtons();',context);
 assert.equal(white.values.get('color'),'#fff');assert.equal(white.values.get('-webkit-text-fill-color'),'#fff');
 assert.equal(plain.values.get('color'),'#513a68');assert.equal(plain.priorities.get('color'),'important');assert.equal(plain.priorities.get('-webkit-text-fill-color'),'important');
 const added=button();buttons.push(added);vm.runInContext('styleHelperButtons()',context);assert.equal(added.values.get('color'),'#513a68');
 assert.match(src,/new MutationObserver\(styleHelperButtons\)\.observe\(panel,\{childList:true,subtree:true\}\)/);
});
test('sticky actions follow measured header height including wrapping and hidden-panel recovery',()=>{
 let height=0;const values={};const context={el:()=>({getBoundingClientRect:()=>({height})}),panel:{style:{setProperty:(k,v)=>values[k]=v}}};vm.createContext(context);vm.runInContext(extract('measureHelperHeader'),context);
 for(const [input,expected] of [[0,'44px'],[60,'48px'],[91.2,'80px']]){height=input;vm.runInContext('measureHelperHeader()',context);assert.equal(values['--bbp-header-height'],expected);}
 assert.match(src,/new ResizeObserver\(measureHelperHeader\)/);
 assert.match(src,/grid-template-columns:minmax\(0,1fr\) 80px/);
 assert.match(src,/#qClose\{flex:0 0 44px;min-width:44px;min-height:44px/);
});
test('only the optional known diagnostic toggle is docked without firing its listener',()=>{
 const begin=src.indexOf(' if(window.__bbpCatalogReadDiagnosticV1){',src.indexOf('const advanced='));const end=src.indexOf(" const load=el('#qLoad',panel);",begin);assert.ok(begin>0&&end>begin);
 let clicks=0;const own={textContent:'🔎 목록 진단',style:{position:'fixed',zIndex:'2147483647'},click:()=>clicks++};const other={textContent:'사이트 버튼',style:{position:'fixed',zIndex:'2147483647'}};const moved=[];
 const context={window:{__bbpCatalogReadDiagnosticV1:{}},document:{querySelectorAll:()=>[other,own]},advanced:{appendChild:x=>moved.push(x)}};vm.runInNewContext(src.slice(begin,end),context);
 assert.deepEqual(moved,[own]);assert.equal(own.style.position,'static');assert.equal(other.style.position,'fixed');assert.equal(clicks,0);
});
