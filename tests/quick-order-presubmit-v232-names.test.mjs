import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../bebepick-quick-order-preorder-test-v232.js',import.meta.url),'utf8');
const old=readFileSync(new URL('../bebepick-quick-order-preorder-test-v231.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../bebepick-preorder-names-v232-install.html',import.meta.url),'utf8');
function segment(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i, 'missing '+a);return src.slice(i,j);}
const matchFn=new Function(
 'const nameKey=n=>String(n||"").normalize("NFC").trim().replace(/\\s+/g,"").toLocaleLowerCase("ko-KR");'+
 'const validSku=s=>/^[A-Z0-9-]{2,24}$/.test(String(s||""));'+
 'const availableHere=p=>p&&(!p.only||p.only==="china");'+
 'const allowedOption=(p,opt)=>opt==="single"||!!(p.has_fullbox&&p.pack_size>1);'+
 'const saleableFor=(p,x)=>allowedOption(p,x.option)&&(p.stock===null||p.stock==="low")&&(x.option!=="fullbox"||p.fullbox_out===false)&&(!p.per_person_max||x.qty*(x.option==="fullbox"?p.pack_size:1)<=p.per_person_max);'+
 segment('function inspectNameCandidates(rows,candidates){','function fillCatalog(){')+
 'return inspectNameCandidates;')();
const candidate=(name,qty=1,option='single')=>({name,qty,option});
const doll=(sku,name,stock='low',extra={})=>({sku,name,stock,only:'china',...extra});
test('v2.3.2 exists independently of v2.3.1 and parses',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.match(src,/__bbpPreSubmitTestV232/);
 assert.match(src,/bbp_preorder_test_v232_/);
 assert.match(old,/__bbpPreSubmitTestV231/);
 assert.match(html,/bebepick-quick-order-preorder-test-v232\.js/);
 assert.match(src,/MAX_NAMES=20/);
});
test('multiple names: select only one from first saleable priority; ignore missing and out-of-stock',()=>{
 const c=[candidate('후보 A'),candidate('후보 B',2),candidate('후보 C')];
 const p=[doll('D101','후보 B'),doll('D100','후보 A','out'),doll('D300','후보 C')];
 const result=matchFn(p,c);
 assert.deepEqual(result.selected,{name:'후보 B',item:{sku:'D101',option:'single',qty:2}});
 assert.equal(result.states[0].state,'공식 목록 발견 D100 · 재고 대기');
 assert.equal(result.states[2].state,'판매 가능 · D300');
});
test('deterministic priority when multiple become saleable at once',()=>{
 const c=[candidate('A인형'),candidate('B인형')];
 const result=matchFn([doll('D202','B인형'),doll('D101','A인형')],c);
 assert.equal(result.selected.item.sku,'D101');
 assert.equal(result.selected.name,'A인형');
});
test('exact matching ignores spaces but never matches similar-prefix names',()=>{
 const c=[candidate('메이메이 서프라이즈')];
 assert.equal(matchFn([doll('D293','메이메이 서프라이즈파티')],c).selected,null);
 assert.equal(matchFn([doll('D294','메이메이서프라이즈')],c).selected.item.sku,'D294');
});
test('same-name different SKUs are unsafe and must be skipped',()=>{
 const c=[candidate('같은 이름'),candidate('다른 이름')];
 const r=matchFn([doll('D101','같은 이름'),doll('D102','같은 이름'),doll('D103','다른 이름')],c);
 assert.match(r.states[0].state,/동명이인 SKU 2개/);
 assert.equal(r.selected.name,'다른 이름');
});
test('wrong channel, unsupported fullbox, insufficient stock and quantity rules never select',()=>{
 const c=[candidate('첫째',1,'fullbox'),candidate('둘째',3)];
 const p=[doll('D101','첫째','low',{has_fullbox:false}),doll('D201','둘째','out')];
 assert.equal(matchFn(p,c).selected,null);
 assert.equal(matchFn([doll('D201','둘째','low',{only:'main'})],c).selected,null);
 assert.equal(matchFn([doll('D201','둘째','low',{per_person_max:2})],c).selected,null);
});
test('no cart mutation before exact eligible resolution while order OFF; still no final submit',()=>{
 const start=segment("el('#qStart',panel).onclick=","el('#qStop',panel).onclick");
 const poll=segment('async function poll(){','function reloadShow(){');
 const wizard=segment('function watchWizard(){','const ob=new MutationObserver');
 assert.doesNotMatch(start,/await prepare\(\)/);
 assert.match(start,/nameWatchActive=nameCandidates\.length>0/);
 assert.match(start,/cartPrepared=false/);
 assert.match(poll,/windowOk===true&&scan\.selected/);
 assert.match(poll,/if\(!cartPrepared&&windowOk===true&&allSaleable\(\)\)/);
 assert.match(poll,/lockedCandidate=scan\.selected/);
 assert.match(poll,/candidate_selected/);
 assert.match(wizard,/pre_submit_ready/);
 assert.doesNotMatch(wizard,/ok\.click\s*\(/);
 assert.doesNotMatch(src,/\bok\.click\s*\(|\bsubmitClicked=true\b|querySelector\('#ocAll'\)|function watchPrePayment\(/);
 assert.doesNotMatch(src,/id="qAutoOrder"|id="qDryRun"|rpc\(['"]create_orders/);
});
test('candidate UI saves names and is never editable once monitoring begins',()=>{
 const handler=segment('controls.addName.onclick=',"controls.add.onclick=");
 assert.match(handler,/active\|\|completed/);
 assert.match(handler,/nameCandidates\.length>=MAX_NAMES/);
 assert.match(handler,/nameCandidates\.push/);
 assert.match(handler,/savePref\(\)/);
 assert.match(src,/nameCandidates:nameCandidates\.map/);
 assert.match(src,/candidate_state/);
});
