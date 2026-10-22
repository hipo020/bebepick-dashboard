import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../bebepick-quick-order-preorder-test-v231.js',import.meta.url),'utf8');
const live=readFileSync(new URL('../bebepick-quick-order-general-v23.js',import.meta.url),'utf8');
const install=readFileSync(new URL('../bebepick-preorder-transition-v231-install.html',import.meta.url),'utf8');
function part(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a+' missing');return src.slice(i,j);}
test('separate v2.3.1 assistant parses, leaves actual v2.3 live assistant untouched',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.match(src,/__bbpPreSubmitTestV231/);
 assert.match(src,/bbp_preorder_test_v231_/);
 assert.match(live,/__bbpGeneralQuickV23/);
 assert.match(install,/bebepick-quick-order-preorder-test-v231\.js/);
 assert.match(src,/주문번호 생성 X/);
});
test('NO live final order, order number creation, payment or final checkbox path',()=>{
 const wizard=part('function watchWizard(){','const ob=new MutationObserver');
 assert.match(wizard,/pre_submit_ready/);
 assert.match(wizard,/if\(wizardTimer\)clearInterval\(wizardTimer\)/);
 assert.doesNotMatch(wizard,/ok\.click\s*\(/);
 assert.doesNotMatch(wizard,/querySelector\('#ocAll'\)|checked=true;all\.dispatchEvent/);
 assert.doesNotMatch(src,/rpc\(['"]create_orders|rpc\(['"]payapp_start/);
 assert.doesNotMatch(src,/(?:ok|pay)\.click\(\);/);
 assert.doesNotMatch(src,/id="qAutoOrder"|id="qDryRun"|id="qPayAuto"/);
 assert.doesNotMatch(src,/function watchPrePayment\(/);
 assert.doesNotMatch(src,/\bsubmitClicked=true\b/);
});
test('real order intake, NOT yt_live, is the required opening signal',()=>{
 const fn=new Function(part('function serverOpen(w){','function matchesStorage(')+'return serverOpen;')();
 assert.equal(fn({open:false,closed:true,enabled:true,yt_live:true}),false);
 assert.equal(fn({open:true,closed:false,enabled:true,yt_live:false}),true);
 assert.equal(fn({open:true,closed:false,enabled:false,yt_live:true}),false);
 assert.equal(fn({open:true,closed:false,enabled:true,reason:'paused'}),false);
 assert.match(src,/site_live_marker/);
 assert.match(src,/order_state/);
});
test('OFF state does not touch the cart, ON state requires every selected SKU to be saleable',()=>{
 const start=part("el('#qStart',panel).onclick=", "el('#qStop',panel).onclick");
 assert.doesNotMatch(start,/await prepare\(\)/);
 assert.match(start,/cartPrepared=false/);
 assert.match(start,/autoOrder=true;dryRun=true;autoPay=false/);
 const polling=part('async function poll(){','function reloadShow(){');
 assert.match(polling,/if\(!cartPrepared&&windowOk===true&&allSaleable\(\)\)/);
 assert.match(polling,/if\(windowOk&&productOk\)/);
 assert.match(polling,/targets\.some\(x=>!x\)/);
 assert.match(polling,/order_state/);
 assert.match(polling,/site_live_marker/);
 const handoff=part('function handoff(){','controls.add.onclick');
 assert.match(handoff,/chosenItems\(\)\.every/);
 assert.match(handoff,/if\(!w\|\|!shopFresh\)/);
 assert.match(handoff,/if\(!expected\(\)\)/);
});
test('only opening cart and first-stage confirmation are clicked',()=>{
 const wizard=part('function watchWizard(){','const ob=new MutationObserver');
 assert.match(wizard,/data-oc-agree/);
 assert.match(wizard,/next\.click\(\)/);
 assert.match(wizard,/다른 주문의 보관\/발송 변경 경고/);
 assert.match(wizard,/최종 선택값 불일치/);
 assert.match(wizard,/timingStop\('최종 주문 확정 직전/);
 const handoff=part('function handoff(){','controls.add.onclick');
 assert.match(handoff,/btn\.click\(\)/);
 assert.match(handoff,/next\.click\(\)/);
 assert.match(handoff,/foldOfficial\(\)/);
});
test('monitor records DOM state, times and keeps sensitive information out of output',()=>{
 assert.match(src,/domWatchTimer=setInterval\(checkOfficialDom,250\)/);
 assert.match(src,/timingMark\('official_dom_state'/);
 assert.match(src,/timingMark\('order_state'/);
 assert.match(src,/timingMark\('site_live_marker'/);
 assert.match(src,/pre_submit_ready/);
 assert.match(src,/if\(document.hidden\)/);
 assert.match(src,/cache:'no-store'/);
 assert.doesNotMatch(part('function timingReport(){','function persistTimingSoon()'),/access_token|phone|address|orderNumber/);
});
