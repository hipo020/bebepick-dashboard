import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../bebepick-quick-order-general-v23.js',import.meta.url),'utf8');
const old=readFileSync(new URL('../bebepick-quick-order-general-v222.js',import.meta.url),'utf8');
function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start+' not found');return source.slice(a,b);}
test('v2.3 syntax valid, isolated entry, stable previous version unchanged',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(source,/version:'2\.3\.0'/);
 assert.match(old,/version:'2\.2\.2'/);
 assert.match(source,/id='bbpQuickGeneralV23'/);
 assert.match(source,/PREF_KEY='bbp_quick_general_v23_/);
});
test('sameItems validates full SKU, variant and quantity set regardless of order',()=>{
 const f=new Function(part('function itemKey(x){','function itemTarget(x){')+'return sameItems;')();
 const a=[{sku:'D101',option:'single',qty:2},{sku:'D102',option:'fullbox',qty:1}];
 assert.equal(f(a,[...a].reverse()),true);
 assert.equal(f(a,[{...a[0],qty:1},a[1]]),false);
 assert.equal(f(a,[a[0],{...a[1],option:'single'}]),false);
 assert.equal(f(a,[a[0]]),false);
});
test('all items are required before cart preparation and official handoff',()=>{
 const poll=part('async function poll(){','function reloadShow(){');
 assert.match(poll,/chosen\.map\(itemTarget\)/);
 assert.match(poll,/targets\.some\(x=>!x\)/);
 assert.match(poll,/if\(!cartPrepared&&allSaleable\(\)\)/);
 assert.match(poll,/productOk=!!cartPrepared&&allSaleable\(\)/);
 const handoff=part('function handoff(){','controls.add.onclick');
 assert.match(handoff,/chosenItems\(\)\.every\(x=>/);
 assert.match(handoff,/!shopFresh/);
 assert.match(handoff,/if\(!expected\(\)\)/);
});
test('qty guard, store cart isolation, existing multi-item cart equality',()=>{
 const prepare=part('async function prepare(){','function prefill(){');
 assert.match(prepare,/for\(const x of list\)/);
 assert.match(prepare,/!saleableFor\(p,x\)/);
 assert.match(prepare,/sameItems\(cur,list\)/);
 assert.match(prepare,/c\.filter\(x=>!belongs\(x\)\)/);
 assert.match(prepare,/preserved\.concat\(added\)/);
 const controls=part('controls.add.onclick=','controls.reload.onclick=');
 assert.match(controls,/Number\.isInteger\(qty\)/);
 assert.match(controls,/MAX_QTY/);
 assert.match(controls,/MAX_LINES/);
 assert.match(controls,/controls\.basket\.addEventListener/);
});
test('dry run and explicit full basket approval before live submission',()=>{
 const start=part("el('#qStart',panel).onclick=", "el('#qStop',panel).onclick=");
 assert.match(start,/autoOrder&&!dryRun/);
 assert.match(start,/recentSubmit\(\)/);
 assert.match(start,/confirm\('⚠ 여러 인형 실제 주문 자동 생성 확인/);
 assert.match(start,/summaryItems\(\)/);
 assert.match(start,/autoPay=false/);
 const wizard=part('function watchWizard(){','const ob=new MutationObserver');
 assert.match(wizard,/if\(dryRun\)/);
 assert.match(wizard,/if\(recentSubmit\(\)\)/);
 assert.match(wizard,/if\(!expected\(\)\)/);
 assert.match(wizard,/data-oc-agree="convert"/);
 assert.match(wizard,/submitClicked=true/);
 assert.match(wizard,/ok\.click\(\)/);
});
test('no forced payment, guards and official pre-payment scrolling retained',()=>{
 assert.doesNotMatch(source,/pay\.click\(\)|function watchPay\(/);
 assert.doesNotMatch(source,/rpc\(['"]create_orders|rpc\(['"]payapp_start|authorization.*console\.log/);
 assert.doesNotMatch(source,/qPayAuto/);
 assert.match(source,/function foldOfficial\(\)/);
 assert.match(source,/target\.scrollIntoView\(\{block:'end'/);
 assert.match(source,/foldOfficial\(\)/);
 assert.match(source,/reason!=='paused'/);
 assert.match(source,/other-store|다른 보관 상품|다른 주문의 보관\/발송 변경 경고/);
});
