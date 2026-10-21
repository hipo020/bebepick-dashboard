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

function prepHarness(initial,requested,{consent=true,saleable=true}={}){
 let saved=JSON.parse(JSON.stringify(initial)),writes=0;const messages=[];
 const prepSource=part('async function prepare(){','function prefill(){');
 const current=()=>saved.filter(x=>(x.store==='china'?'china':'main')==='china');
 const expected=()=>current().length===requested.length&&current().every(x=>requested.some(y=>y.sku===x.sku&&y.option===(x.opt==='fullbox'?'fullbox':'single')&&y.qty===x.qty));
 const create=new Function('chosenItems','itemTarget','availableHere','allowedOption','saleableFor','readCart','belongs','normalized','sameItems','prefill','confirm','message','localStorage','window','StorageEvent','expected','STORE','CART_KEY','summaryItems',prepSource+'return prepare;');
 const same=(a,b)=>a.length===b.length&&a.map(x=>[x.sku,x.option,x.qty].join(':')).sort().join(';')===b.map(x=>[x.sku,x.option,x.qty].join(':')).sort().join(';');
 const fn=create(()=>requested,()=>({stock:'low'}),()=>true,()=>true,()=>saleable,()=>saved,
  x=>(x.store==='china'?'china':'main')==='china',x=>x.opt==='fullbox'?'fullbox':'single',
  same,()=>true,()=>consent,x=>messages.push(x),
  {setItem:(k,v)=>{assert.equal(k,'bbp_cart_v1');writes++;saved=JSON.parse(v)}},
  {dispatchEvent:()=>{}},class StorageEvent{},expected,'china','bbp_cart_v1',()=>requested.map(x=>x.sku).join(','));
 return {run:fn,saved:()=>saved,writes:()=>writes,messages};
}
test('multi-doll prepayment cart writes once, preserves other store, and refuses unexpected replacement',async()=>{
 const selected=[{sku:'D101',option:'single',qty:2},{sku:'D102',option:'fullbox',qty:1}];
 const first=prepHarness([{sku:'MAIN',opt:'single',qty:1,store:'main'}],selected);
 assert.equal(await first.run(),true);
 assert.equal(first.writes(),1);
 assert.deepEqual(first.saved().filter(x=>x.store==='main').map(x=>x.sku),['MAIN']);
 assert.deepEqual(first.saved().filter(x=>x.store==='china').map(x=>x.sku),['D101','D102']);
 const declined=prepHarness([{sku:'UNRELATED',opt:'single',qty:1,store:'china'}],selected,{consent:false});
 assert.equal(await declined.run(),false);
 assert.equal(declined.writes(),0);
 const unavailable=prepHarness([],selected,{saleable:false});
 assert.equal(await unavailable.run(),false);
 assert.equal(unavailable.writes(),0);
});
test('official payment-ready watcher never presses the payment button',()=>{
 const payment=part('function watchPrePayment(){','const ob=new MutationObserver');
 assert.match(payment,/pay_panel/);
 assert.match(payment,/if\(!submitClicked\|\|payDone\)/);
 assert.match(payment,/mini\.textContent=/);
 assert.doesNotMatch(payment,/\.click\(/);
});

test('site LIVE marker alone cannot begin a real checkout when ordering is closed',()=>{
 const fn=new Function(part('function serverOpen(w){','function matchesStorage(')+'return serverOpen;')();
 assert.equal(fn({open:false,closed:true,enabled:true,yt_live:true}),false);
 assert.equal(fn({open:true,closed:false,enabled:true,yt_live:false}),true);
 assert.equal(fn({open:true,closed:false,enabled:true,reason:'paused',yt_live:true}),false);
 assert.equal(fn({open:true,closed:false,enabled:false,yt_live:true}),false);
 const handoff=part('function handoff(){','controls.add.onclick');
 assert.match(handoff,/if\(!w\|\|!shopFresh\)/);
 assert.doesNotMatch(handoff,/LIVE 표시/);
});
