'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-one-tap.user.js'),'utf8');
function browser({host='bebepick.me',pathname='/plus',protocol='https:',iframe=false}={}){
 const nodes=new Map(),appendLog=[];
 const window={};
 window.self=window;window.top=iframe?{}:window;
 const createElement=tag=>{
  const e={tag,id:'',type:'',disabled:false,title:'',textContent:'',style:{cssText:''},listeners:{},
   setAttribute(k,v){this[k]=v;},
   addEventListener(type,fn){this.listeners[type]=fn;},
   remove(){nodes.delete(this.id);}
  };
  return e;
 };
 const appendChild=e=>{appendLog.push(e);if(e.id)nodes.set(e.id,e);return e};
 const document={
  getElementById:id=>nodes.get(id)||null,
  createElement,
  head:{appendChild},
  body:{appendChild},
  documentElement:{appendChild}
 };
 const location={hostname:host,pathname,protocol};
 vm.runInNewContext(src,{document,window,location,Set});
 return {window,location,document,nodes,appendLog,button:nodes.get('bbpFirefoxOneTapLauncher')};
}
test('valid official pages display a non-submitting button without loading the helper',()=>{
 for(const p of ['/plus','/plus/','/live','/live/']){
  const x=browser({pathname:p});
  assert.ok(x.button,'launch button: '+p);
  assert.equal(x.appendLog.filter(n=>n.tag==='script').length,0);
  assert.match(x.button.textContent,/주문 도우미/);
  assert.equal(x.button.disabled,false);
 }
});
test('unrelated, payment, non-HTTPS, and iframe pages never inject the button',()=>{
 for(const x of [
  browser({host:'payapp.kr'}),browser({pathname:'/settings'}),
  browser({pathname:'/plus/other'}),browser({protocol:'http:'}),browser({iframe:true})
 ])assert.equal(x.button,undefined);
});
test('only direct tap injects the pinned v2.4 source once; no order click in launcher',()=>{
 const x=browser();const tap=x.button.listeners.click;
 tap();tap();
 const scripts=x.appendLog.filter(n=>n.tag==='script');
 assert.equal(scripts.length,1);
 assert.match(scripts[0].src,/bebepick-quick-order-general-v24\.js\?v=20261025-v24-conditional-700-900-v16/);
 assert.equal(x.button.disabled,true);
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|\.click\s*\(|dispatchEvent|credit.?card|cardnumber|cvv|create_order|payapp\.kr/i);
});
test('once helper loaded, further taps only show existing panel',()=>{
 const x=browser();x.button.listeners.click();
 let shown=0;x.window.__bbpGeneralQuickV24={show:()=>shown++};
 const script=x.nodes.get('bbpFirefoxOneTapHelperSource');
 script.listeners.load();
 assert.equal(x.button.disabled,false);
 x.button.listeners.click();
 assert.equal(shown,1);
 assert.equal(x.appendLog.filter(n=>n.tag==='script').length,1);
});
test('failed script load allows manual retry without any automatic purchase action',()=>{
 const x=browser();x.button.listeners.click();
 const first=x.nodes.get('bbpFirefoxOneTapHelperSource');
 first.listeners.error();
 assert.equal(x.nodes.has('bbpFirefoxOneTapHelperSource'),false);
 assert.equal(x.button.disabled,false);
 x.button.listeners.click();
 assert.equal(x.appendLog.filter(n=>n.tag==='script').length,2);
});
test('metadata restricts the extension to official store pages and requires user gesture',()=>{
 assert.match(src,/\/\/ @grant\s+none/);
 assert.match(src,/\/\/ @noframes/);
 assert.match(src,/\/\/ @match\s+https:\/\/bebepick\.me\/plus/);
 assert.match(src,/\/\/ @match\s+https:\/\/bebepick\.me\/live/);
 assert.match(src,/button\.addEventListener\('click'/);
 assert.doesNotMatch(src,/button\.click\(\)/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
