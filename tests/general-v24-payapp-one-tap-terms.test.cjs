'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(dir,'bebepick-quick-order-v24-install.html'),'utf8');
const main=fs.readFileSync(path.join(dir,'bebepick-quick-order-general-v24.js'),'utf8');
const script=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
assert.ok(script,'installer inline script missing');
const helper=(script.match(/function payappTermsNext\(\)\{[\s\S]*?\n\}/)||[])[0];
assert.ok(helper,'inline helper function not found');
const payappFunction=new Function('return ('+helper+');')();
function simulate({host='payapp.kr',path='/WEBPAY_INPUT/test',title='PAYAPP 전자금융거래 이용약관 개인정보 처리방침 동의 전체동의 다음',enabled=true,confirmConsent=true}={}){
 const events=[],checked=[{checked:enabled},{checked:enabled}];
 const next={isConnected:true,disabled:!enabled,innerText:'다음',getAttribute:()=>null,click:()=>events.push('next-click')};
 const agree={isConnected:true,innerText:'전체동의',textContent:'전체동의',click:()=>{
  events.push('agree-click');next.disabled=false;checked.forEach(x=>x.checked=true);
 }};
 const doc={body:{innerText:title},querySelectorAll:(sel)=>{
  if(sel==='input[type="checkbox"]')return checked;
  if(sel.startsWith('button,input'))return [next];
  if(sel.startsWith('label,'))return [agree];
  return [];
 }};
 const original={document:global.document,location:global.location,getComputedStyle:global.getComputedStyle,confirm:global.confirm,alert:global.alert,setInterval:global.setInterval,clearInterval:global.clearInterval};
 try{
  global.document=doc;global.location={hostname:host,pathname:path};
  global.getComputedStyle=()=>({display:'block',visibility:'visible'});
  global.confirm=()=>confirmConsent;
  global.alert=v=>events.push('alert:'+String(v).slice(0,40));
  global.setInterval=fn=>{fn();return 1};
  global.clearInterval=()=>{};
  payappFunction();return events;
 }finally{Object.assign(global,original);}
}
test('installer generates independent short store and payment bookmarks',()=>{
 const fields={};
 const ids=['bookmark','payapp-bookmark','check-bookmark','status','payapp-status','check-status','copy','copy-payapp','copy-check'];
 for(const id of ids)fields[id]={value:'',textContent:'',onclick:null};
 new Function('document','navigator',script)({getElementById:id=>fields[id]},{clipboard:{writeText:()=>Promise.resolve()}});
 const mainCode=fields.bookmark.value,payCode=fields['payapp-bookmark'].value,checkCode=fields['check-bookmark'].value;
 assert.match(mainCode,/^javascript:/);assert.ok(mainCode.length<700);
 assert.doesNotMatch(mainCode,/function payappTermsNext/);
 assert.match(mainCode,/bebepick-quick-order-general-v24\.js/);
 assert.match(payCode,/^javascript:/);assert.match(payCode,/function payappTermsNext\(\)/);
 assert.match(checkCode,/북마크 실행 확인/);
 for(const c of [mainCode,payCode,checkCode]){
  assert.doesNotThrow(()=>new Function(c.slice('javascript:'.length)));
  assert.equal(c.includes('\\n'),false);
 }
});
test('payment consent and next require explicit one-time user interaction; no payment data touched',()=>{
 assert.deepEqual(simulate(),['next-click']);
 assert.deepEqual(simulate({enabled:false}),['agree-click','next-click']);
 assert.deepEqual(simulate({confirmConsent:false}),[]);
 const sensitive=/localStorage|sessionStorage|fetch\(|XMLHttpRequest|cardNumber|creditCard|cvv|cvc|form\.submit|postMessage|navigator\.clipboard|PAYAPP.*?결제완료|pay-card/;
 assert.doesNotMatch(helper,sensitive);
});
test('unsupported site or different page does nothing',()=>{
 const a=simulate({host:'example.com'});
 assert.equal(a.filter(x=>x.includes('click')).length,0);
 const b=simulate({path:'/other'});
 assert.equal(b.filter(x=>x.includes('click')).length,0);
 const c=simulate({title:'PAYAPP 카드정보 입력'});
 assert.equal(c.filter(x=>x.includes('click')).length,0);
});
test('first-site order confirmation selectors are diagnosed, not blindly bypassed',()=>{
 assert.match(main,/function wizardShape\(\)/);
 assert.match(main,/timingMark\('wizard_timeout',wizardShape\(\)\)/);
 assert.match(main,/timingOnce\('wizard_dom_wait'/);
 assert.match(main,/const box=el\('\.oc\[role="alertdialog"\] \.oc-box'\)/);
 assert.match(main,/if\(!confirm\(exactConsent\)\)return/);
 assert.match(main,/payArmed=autoPay&&!dryRun/);
});
