'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
test('Firefox helper has valid JavaScript syntax with all option controls',()=>{
 assert.doesNotThrow(()=>new vm.Script(src,{filename:'bebepick-quick-order-general-v24.js'}));
 for(const id of ['qPick','qDisplay','qOpen','qStorage'])
  assert.match(src,new RegExp('id="'+id+'"'));
 assert.match(src,/v\.note=pick==='셀러픽'\?\{pick:true\}:null/);
 assert.match(src,/v\.anon=display==='익명'/);
 assert.match(src,/data-pick/);
 assert.match(src,/#anonRow/);
});
const begin=src.indexOf(' function chosenOrderOptionsSnapshot(){');
const end=src.indexOf(' function staleOfficialUi(reason){',begin);
assert.ok(begin>0&&end>begin,'real site option guard functions are present');
const extract=src.slice(begin,end)+'\n;({chosenOrderOptionsSnapshot,officialChoiceRow,correctOrderControls,officialConfirmationChoicesMatch})';

function environment(choice='셀러픽',display='익명',hasPick=true,hasAnon=true){
 let opts={storage:'보관',open:'개봉',note:null,anon:false};
 const optionSets={};
 function group(attribute,values){
  const btns=values.map((value,i)=>{
   const attrs={['data-'+attribute]:value,'aria-checked':i===0?'true':'false'};
   const b={attrs,disabled:false,classList:{contains:()=>false},getAttribute:k=>attrs[k]??null,
    hasAttribute:k=>Object.prototype.hasOwnProperty.call(attrs,k),
    setAttribute:(k,v)=>{attrs[k]=String(v);}};
   b.click=()=>{
    btns.forEach(x=>x.attrs['aria-checked']=x===b?'true':'false');
    if(attribute==='pick')opts.note=value==='셀러픽'?{pick:true}:null;
    if(attribute==='anon')opts.anon=value==='익명';
   };
   return b;
  });
  return {querySelectorAll:()=>btns,buttons:btns};
 }
 if(hasPick)optionSets['#noteRow']=group('pick',['직접 고르기','셀러픽']);
 if(hasAnon)optionSets['#anonRow']=group('anon',['닉네임','익명']);
 const storageBtn={getAttribute:()=> 'true',click:()=>{}};
 const openBtn={getAttribute:()=> 'true',click:()=>{}};
 const panel={querySelector(sel){
  if(sel==='#noteRow'||sel==='#anonRow')return optionSets[sel]||null;
  if(sel==='[data-storage="보관"]')return storageBtn;
  if(sel==='[data-open="개봉"]')return openBtn;
  return null;
 }};
 const ctx={pick:choice,display,storage:'보관',open:'개봉',OPTS_KEY:'bbp_order_opts',Array,JSON,
  sessionStorage:{getItem:()=>JSON.stringify(opts)},el:(s,p)=>p.querySelector(s)};
 const funcs=vm.runInNewContext(extract,ctx);
 return {opts,optionSets,panel,funcs,ctx};
}
test('seller-pick + anonymous are selected from official cart DOM only and persisted',()=>{
 const e=environment();
 assert.equal(e.funcs.correctOrderControls(e.panel),true);
 assert.deepEqual({...e.opts.note},{pick:true});
 assert.equal(e.opts.anon,true);
 assert.equal(e.optionSets['#noteRow'].buttons[1].getAttribute('aria-checked'),'true');
 assert.equal(e.optionSets['#anonRow'].buttons[1].getAttribute('aria-checked'),'true');
});
test('default direct pick + nickname works without feature entitlements',()=>{
 const e=environment('직접 고르기','닉네임',false,false);
 assert.equal(e.funcs.correctOrderControls(e.panel),true);
 assert.equal(e.opts.note,null);
 assert.equal(e.opts.anon,false);
});
test('explicit seller-pick or anonymous fails closed if official row is not present',()=>{
 const a=environment('셀러픽','닉네임',false,true);
 const b=environment('직접 고르기','익명',true,false);
 assert.equal(a.funcs.correctOrderControls(a.panel),false);
 assert.equal(b.funcs.correctOrderControls(b.panel),false);
});
test('confirmation step one and step two check selected pick and anonymity',()=>{
 const e=environment();
 assert.equal(e.funcs.correctOrderControls(e.panel),true);
 const box={querySelector(sel){
  if(sel==='#ocNote'||sel==='#ocNote2')return {textContent:'인형 고르기 — 셀러픽'};
  if(sel==='#ocAnon')return {textContent:'익명 주문'};
  return null;
 }};
 assert.equal(e.funcs.officialConfirmationChoicesMatch(box,true),true);
 assert.equal(e.funcs.officialConfirmationChoicesMatch(box,false),true);
 e.opts.anon=false;
 assert.equal(e.funcs.officialConfirmationChoicesMatch(box,true),false);
 assert.equal(e.funcs.officialConfirmationChoicesMatch(box,false),false);
});
test('the site values are checked before submission and any same-dialog retry',()=>{
 assert.match(src,/!officialConfirmationChoicesMatch\(box,true\)/);
 assert.match(src,/!officialConfirmationChoicesMatch\(box,false\)/);
 assert.match(src,/!chosenOrderOptionsSnapshot\(\)/);
 assert.match(src,/if\(pick==='셀러픽'&&!chosen\.some\(x=>x\.option==='single'\)\)/);
 assert.match(src,/인형 고르기 '\+pick\+' · 표시 '\+display/);
});
test('the original complete confirmation and payment consent paths remain unchanged',()=>{
 assert.match(src,/if\(!autoOrder\|\|dryRun\|\|!submitClicked/);
 assert.match(src,/if\(document\.hidden\)\{abortWizard/);
 assert.match(src,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(src,/try\{ok\.click\(\);\}/);
});
