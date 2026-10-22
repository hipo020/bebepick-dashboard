import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../bebepick-quick-order-general-v24.js',import.meta.url),'utf8');
const old=readFileSync(new URL('../bebepick-quick-order-general-v23.js',import.meta.url),'utf8');
const install=readFileSync(new URL('../bebepick-quick-order-v24-install.html',import.meta.url),'utf8');
function part(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'source missing '+a);return src.slice(i,j);}
const matchFn=new Function(
 'let armedMode="names",items=[];const nameKey=n=>String(n||"").normalize("NFC").trim().replace(/\\s+/g,"").toLocaleLowerCase("ko-KR");'+
 'const validSku=s=>/^[A-Z0-9-]{2,24}$/.test(String(s||""));'+
 'const availableHere=p=>p&&(!p.only||p.only==="china");'+
 'const allowedOption=(p,opt)=>opt==="single"||!!(p&&p.has_fullbox&&p.pack_size>1);'+
 'const saleableFor=(p,x)=>!!p&&availableHere(p)&&allowedOption(p,x.option)&&(p.stock===null||p.stock==="low")&&(x.option!=="fullbox"||p.fullbox_out===false)&&(!p.per_person_max||x.qty*(x.option==="fullbox"?p.pack_size:1)<=p.per_person_max);'+
 part('function inspectNameCandidates(rows,candidates){','function renderNames(){')+
 'return inspectNameCandidates;')();
const c=(name,qty=1,option='single')=>({name,qty,option});
const p=(sku,name,stock='low',extra={})=>({sku,name,stock,only:'china',...extra});
test('v2.4 independently parses and preserves older v2.3 implementation',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.match(src,/__bbpGeneralQuickV24/);
 assert.match(old,/__bbpGeneralQuickV23/);
 assert.match(src,/bbp_quick_general_v24_/);
 assert.match(install,/bebepick-quick-order-general-v24\.js/);
});
test('register up to 20 names, per-name single/fullbox option, separate explicit mode',()=>{
 assert.match(src,/MAX_NAMES=20/);
 assert.match(src,/id="qWatchMode"/);
 assert.match(src,/id="qNameOpt"/);
 assert.match(src,/id="qAddName"/);
 assert.match(src,/nameCandidates\.push\(\{name,qty,option:opt\}\)/);
 assert.match(src,/controls\.nameOpt\.value/);
 assert.match(src,/watchMode='names';controls\.watchMode\.value='names'/);
 assert.match(src,/\['sku','names','mixed'\]\.includes\(pref\.watchMode\)/);
 assert.match(src,/watchMode,nameCandidates/);
});
test('choose highest priority currently saleable name, not all products',()=>{
 const out=matchFn([p('D201','2번'),p('D101','1번','out'),p('D301','3번')],[c('1번'),c('2번',3),c('3번')]);
 assert.deepEqual(out.selected,{name:'2번',item:{sku:'D201',option:'single',qty:3}});
 assert.equal(out.states[0].state,'SKU D101 · 재고/구매한도 대기');
});
test('first candidate wins tie regardless of catalog order',()=>{
 const out=matchFn([p('D301','삼번'),p('D201','이번'),p('D101','일번')],[c('일번'),c('이번'),c('삼번')]);
 assert.equal(out.selected.item.sku,'D101');
});
test('prefix name differs from exact name; ignore spacing only',()=>{
 assert.equal(matchFn([p('D293','메이메이 서프라이즈파티')],[c('메이메이 서프라이즈')]).selected,null);
 assert.equal(matchFn([p('D294','메이메이서프라이즈')],[c('메이메이 서프라이즈')]).selected.item.sku,'D294');
});
test('duplicate product names never auto-select or auto-submit that candidate',()=>{
 const out=matchFn([p('D101','중복'),p('D102','중복'),p('D103','고유')],[c('중복'),c('고유')]);
 assert.match(out.states[0].state,/동명 SKU 2개/);
 assert.equal(out.selected.item.sku,'D103');
});
test('different store, wrong fullbox, stock, qty constraints prevent selection',()=>{
 assert.equal(matchFn([p('D101','다른매장','low',{only:'main'})],[c('다른매장')]).selected,null);
 assert.equal(matchFn([p('D101','풀박스','low',{has_fullbox:false})],[c('풀박스',1,'fullbox')]).selected,null);
 assert.equal(matchFn([p('D101','수량','low',{per_person_max:2})],[c('수량',3)]).selected,null);
 assert.equal(matchFn([p('D101','품절','out')],[c('품절')]).selected,null);
});
test('no cart edits while name unresolved or order closed',()=>{
 const start=part("el('#qStart',panel).onclick=", "el('#qStop',panel).onclick");
 const poll=part('async function poll(){','function reloadShow(){');
 assert.match(start,/armedMode=watchMode;lockedCandidate=null/);
 assert.match(start,/armedMode==='sku'&&allSaleable\(\)/);
 assert.match(start,/cartPrepared=false;awaitingCatalog=namedMode\(\)/);
 assert.match(poll,/!lockedCandidate&&windowOk===true&&scan\.selected/);
 assert.match(poll,/if\(!cartPrepared&&\(armedMode==='sku'\|\|windowOk===true\)&&allSaleable\(\)\)/);
 assert.match(poll,/lockedCandidate=scan\.selected/);
});
test('actual order is opt-in only with dynamic names/quantity consent and no payment auto-click',()=>{
 const start=part("el('#qStart',panel).onclick=", "el('#qStop',panel).onclick");
 const wizard=part('function watchWizard(){','function watchPrePayment(){');
 assert.match(src,/id="qAutoOrder"/);
 assert.match(src,/id="qDryRun" checked/);
 assert.match(start,/if\(autoOrder&&!dryRun\)/);
 assert.match(start,/if\(!confirm\(realConsent\)\)return/);
 assert.match(start,/nameCandidates\.map/);
 assert.match(start,/어느 후보가 선택될지는 아직 확정되지 않았어/);
 assert.match(wizard,/if\(dryRun\)/);
 assert.match(wizard,/recentSubmit\(\)/);
 assert.match(wizard,/submitClicked=true/);
 assert.equal((wizard.match(/\bok\.click\(\)/g)||[]).length,1);
 assert.doesNotMatch(src,/\bpay\.click\(\)/);
});
test('locked SKU must still be same named product immediately before checkout and submit',()=>{
 const handoff=part('function handoff(){','controls.watchMode.addEventListener');
 const wizard=part('function watchWizard(){','function watchPrePayment(){');
 assert.match(src,/function lockedCandidateValid\(rows= catalog\)/);
 assert.match(handoff,/namedMode\(\)\&\&!lockedCandidateValid\(\)/);
 assert.match(wizard,/namedMode\(\)\&\&!lockedCandidateValid\(\)/);
 assert.match(wizard,/최종 주문 전에 상품명·SKU가 변경됨/);
});
test('maintain original all-SKU mode and avoid automatically arming imported diagnostic names',()=>{
 assert.match(src,/watchMode=\['sku','names','mixed'\]\.includes\(pref\.watchMode\)/);
 assert.match(src,/bbp_preorder_test_v232_/);
 assert.match(src,/armedMode==='sku'&&allSaleable\(\)/);
 assert.match(src,/if\(armedMode==='names'\)return lockedCandidate\?/);
 assert.match(src,/items\.length\?items\.map/);
});
