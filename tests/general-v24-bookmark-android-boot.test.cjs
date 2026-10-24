'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','bebepick-quick-order-v24-install.html'),'utf8');
const body=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
function bookmarkCode(){
 const controls={};
 for(const id of ['bookmark','payapp-bookmark','check-bookmark','copy','copy-payapp','copy-check','status','payapp-status','check-status'])
  controls[id]={value:'',onclick:null,textContent:''};
 new Function('document','navigator',body)({getElementById:k=>controls[k]}, {clipboard:{writeText:async()=>{}}});
 return controls.bookmark.value;
}
test('Samsung Chrome bookmark must be a single line and under 700 chars',()=>{
 const code=bookmarkCode();
 assert.ok(code.startsWith('javascript:'),'Chrome bookmark must retain protocol');
 assert.equal(code.length<700,true,'Mobile URL is excessively long: '+code.length);
 assert.equal(/[\r\n]/.test(code),false,'Raw newlines in Android Chrome bookmark URLs may be removed');
 assert.doesNotMatch(code,/\/\/ Inline-only|\/\/ Data-only|\/\/ Never/);
 assert.doesNotThrow(()=>new Function(code.slice('javascript:'.length)));
});
test('main store launcher injects only the known helper source, no extra clicks',()=>{
 const created=[],clicked=[],errors=[],script={};
 const doc={createElement:(t)=>{assert.equal(t,'script');return script},
  documentElement:{appendChild:(s)=>created.push(s)}};
 const code=bookmarkCode();
 new Function('location','document','window','alert',code.slice(11))(
  {hostname:'bebepick.me'},doc,{__bbpGeneralQuickV24:true},e=>errors.push(e)
 );
 assert.equal(created.length,1);
 assert.match(script.src,/^https:\/\/hipo020\.github\.io\/bebepick-dashboard\/bebepick-quick-order-general-v24\.js\?v=/);
 assert.equal(clicked.length,0);
 assert.deepEqual(errors,[]);
});
test('bootstrap has a user-visible failure on load error, not a silent empty screen',()=>{
 const messages=[],loaded=[];
 const script={},doc={createElement:()=>script,documentElement:{appendChild:c=>loaded.push(c)}};
 const code=bookmarkCode();
 new Function('location','document','window','alert',code.slice(11))(
  {hostname:'bebepick.me'},doc,{},msg=>messages.push(msg)
 );
 assert.equal(loaded.length,1);
 assert.equal(typeof script.onerror,'function');
 assert.equal(typeof script.onload,'function');
 script.onerror();
 assert.ok(messages.length>0);
});

test('PayApp remains a separate opt-in bookmark, and tiny diagnostic confirms Chrome javascript execution',()=>{
 const fields={};for(const id of ['bookmark','payapp-bookmark','check-bookmark','status','payapp-status','check-status','copy','copy-payapp','copy-check'])fields[id]={value:'',textContent:'',onclick:null};
 new Function('document','navigator',body)({getElementById:k=>fields[k]},{clipboard:{writeText:async()=>{}}});
 assert.match(fields['payapp-bookmark'].value,/payappTermsNext/);
 assert.ok(fields['payapp-bookmark'].value.length>fields.bookmark.value.length);
 assert.doesNotMatch(fields.bookmark.value,/payappTermsNext/);
 assert.match(fields['check-bookmark'].value,/^javascript:/);
 let msg='';
 new Function('location','alert',fields['check-bookmark'].value.slice(11))({hostname:'bebepick.me'},x=>{msg=x});
 assert.match(msg,/북마크 실행 확인/);
});
