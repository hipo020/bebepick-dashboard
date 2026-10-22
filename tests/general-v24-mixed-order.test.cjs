'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'bebepick-quick-order-general-v24.js'),'utf8');
const checkScript=fs.readFileSync(path.join(root,'chrome-background-watch/checks.js'),'utf8');
const scope={self:{}};vm.runInNewContext(checkScript,scope);
const {sanitizePlan,isReady}=scope.self.BBPChecks;
const win={china:{open:true,closed:false,enabled:true}};
const catalog=[
 {sku:'D101',name:'기존 1',only:'china',stock:'low',has_fullbox:false},
 {sku:'D102',name:'기존 2',only:'china',stock:'low',has_fullbox:false},
 {sku:'D300',name:'새 인형',only:'china',stock:'low',has_fullbox:false}
];
const mixed={store:'china',watchMode:'mixed',
 items:[{sku:'D101',option:'single',qty:3},{sku:'D102',option:'single',qty:2}],
 nameCandidates:[{name:'새 인형',option:'single',qty:1}]};
test('v2.4 can load and labels the new mixed mode',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/option value="mixed"/);
 assert.match(js,/기존 SKU 전부 \+ 신상 후보 중 1종/);
 assert.match(js,/if\(armedMode==='mixed'\)return lockedCandidate\?/);
});
test('baseline total 5 and a distinct candidate must ALL be in stock and order intake ON',()=>{
 const plan=sanitizePlan(mixed,'/plus');
 assert.equal(plan?.watchMode,'mixed');
 assert.equal(plan.items.reduce((x,y)=>x+y.qty,0),5);
 assert.equal(isReady(win,catalog,plan),true);
 assert.equal(isReady(win,catalog.map(p=>p.sku==='D101'?{...p,stock:'out'}:p),plan),false);
 assert.equal(isReady(win,catalog.map(p=>p.sku==='D300'?{...p,stock:'out'}:p),plan),false);
 assert.equal(isReady({china:{open:false,yt_live:true}},catalog,plan),false);
});
test('one candidate cannot duplicate an existing item',()=>{
 const plan=sanitizePlan({...mixed,nameCandidates:[{name:'기존 1',option:'single',qty:1}]},'/plus');
 assert.equal(isReady(win,catalog,plan),false);
});
test('mixed mode is rejected without baseline or name or wrong store',()=>{
 assert.equal(sanitizePlan({...mixed,items:[]},'/plus'),null);
 assert.equal(sanitizePlan({...mixed,nameCandidates:[]},'/plus'),null);
 assert.equal(sanitizePlan(mixed,'/live'),null);
});
test('mixed mode is capped at 19 baseline lines to leave one new item',()=>{
 const many=Array.from({length:20},(_,i)=>({sku:'D'+String(i+100),option:'single',qty:1}));
 assert.equal(sanitizePlan({...mixed,items:many},'/plus'),null);
});
test('baseline cart never silently replaced and dry-run gate is forced on',()=>{
 const p=js.slice(js.indexOf('async function prepare(){'),js.indexOf('function prefill()'));
 assert.match(p,/armedMode==='mixed'/);
 assert.match(p,/!sameItems\(cur,items\)/);
 assert.match(js,/dryRun=armedMode==='mixed'\?true/);
 assert.match(js,/controls\.autoOrder\.checked=true;controls\.dryRun\.checked=true/);
 assert.match(js,/if\(dryRun\)/);
});
test('baseline can be imported only with user consent, without modifying the vendor cart at import',()=>{
 const p=js.slice(js.indexOf('controls.importCart.onclick'),js.indexOf("controls.basket.addEventListener"));
 assert.match(p,/confirm\(/);
 assert.match(p,/items=converted/);
 assert.doesNotMatch(p,/localStorage\.setItem\(CART_KEY/);
});
