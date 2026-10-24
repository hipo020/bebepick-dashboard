'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-general-v24.js'),'utf8');
const a=src.indexOf('function canRetrySameOfficialDialog(box,ok,all){');
const b=src.indexOf('function abortWizard(',a);
assert.ok(a>0&&b>a,'guard located');
const body=src.slice(a,b);
assert.doesNotMatch(body,/\.click\s*\(|fetch\s*\(|dispatchEvent|XMLHttpRequest|\.rpc\s*\(/);
function scenario(){
 const all={checked:true,isConnected:true};
 const ok={disabled:false,isConnected:true,getAttribute:()=>null};
 const fs={textContent:'보관'},fo={textContent:'개봉'};
 const box={isConnected:true,querySelector(q){
  if(q==='#ocAll')return all;
  if(q==='[data-oc="ok"]')return ok;
  if(q==='#ocStorage2')return fs;
  if(q==='#ocOpen2')return fo;
  return null;
 }};
 const ctx={
  autoOrder:true,dryRun:false,submitClicked:true,manualSubmitObserved:false,payDone:false,
  document:{hidden:false},open:'개봉',expected:()=>true,
  namedMode:()=>false,lockedCandidateValid:()=>true,
  matchesStorage:v=>v==='보관',el:()=>box
 };
 const check=new Function('ctx','with(ctx){'+body+'return canRetrySameOfficialDialog;}')(ctx);
 return {ctx,box,ok,all,fs,fo,check:()=>check(box,ok,all)};
}
test('same unchanged official modal permits one conditional follow-up, not network retry',()=>{
 const x=scenario();
 assert.equal(x.check(),true);
 assert.match(src,/submitAttemptAt-finalAgreeAt<900&&canRetrySameOfficialDialog\(box,ok,all\)/);
 assert.match(src,/setTimeout\(\(\)=>\{[\s\S]*?Date\.now\(\)-finalAgreeAt<900\|\|!canRetrySameOfficialDialog\(box,ok,all\)/);
 assert.match(src,/\},Math\.max\(0,finalAgreeAt\+900-Date\.now\(\)\)\)/);
 assert.equal((src.match(/\bok\.click\(\)/g)||[]).length,2);
});
test('accepted first click synchronously removes modal: second click forbidden',()=>{
 const x=scenario();
 x.box.isConnected=false;
 assert.equal(x.check(),false);
 const y=scenario();
 y.ctx.el=()=>null;
 // ctx was passed into the guard and is mutable.
 assert.equal(y.check(),false);
});
test('swapping modal or button, or clearing consent prevents fallback',()=>{
 const x=scenario();
 x.ctx.el=()=>({isConnected:true});
 assert.equal(x.check(),false);
 const y=scenario();y.ok.disabled=true;assert.equal(y.check(),false);
 const z=scenario();z.all.checked=false;assert.equal(z.check(),false);
 const w=scenario();w.ok.getAttribute=()=> 'true';assert.equal(w.check(),false);
});
test('user intervention, hidden page, manual mode, or changed cart prevent fallback',()=>{
 const a=scenario();a.ctx.manualSubmitObserved=true;assert.equal(a.check(),false);
 const b=scenario();b.ctx.document.hidden=true;assert.equal(b.check(),false);
 const c=scenario();c.ctx.autoOrder=false;assert.equal(c.check(),false);
 const d=scenario();d.ctx.dryRun=true;assert.equal(d.check(),false);
 const e=scenario();e.ctx.payDone=true;assert.equal(e.check(),false);
 const f=scenario();f.ctx.expected=()=>false;assert.equal(f.check(),false);
 const g=scenario();g.fo.textContent='미개봉';assert.equal(g.check(),false);
 const h=scenario();h.ctx.namedMode=()=>true;h.ctx.lockedCandidateValid=()=>false;assert.equal(h.check(),false);
});
test('initial click remains >=700ms, fallback >=900ms, and stop cancels pending timer',()=>{
 assert.match(src,/if\(finalReadyAge<700\)/);
 assert.match(src,/if\(submitAttemptAt-finalAgreeAt<900&&canRetrySameOfficialDialog/);
 assert.match(src,/if\(Date\.now\(\)-finalAgreeAt<900\|\|!canRetrySameOfficialDialog/);
 assert.match(src,/if\(submitRetryTimer\)clearTimeout\(submitRetryTimer\);submitRetryTimer=null/);
 assert.match(src,/if\(recentSubmit\(\)\)\{abortWizard\('중복 주문 요청 방지'\)/);
 const first=src.indexOf('try{ok.click();}',src.indexOf('function watchWizard(){'));
 const second=src.indexOf('try{ok.click();}',first+1);
 assert.ok(first>0&&second>first);
 const text=src.slice(first,second);
 assert.match(text,/canRetrySameOfficialDialog/);
 assert.doesNotMatch(text,/\bfetch\s*\(|\brpc\s*\(/);
});
