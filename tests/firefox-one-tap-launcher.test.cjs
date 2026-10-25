'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','bebepick-firefox-one-tap.user.js'),'utf8');

function browser({host='bebepick.me',pathname='/plus',protocol='https:',iframe=false}={}){
 const nodes=new Map(),appendLog=[],observers=[],windowEvents=new Map();
 const window={};
 window.self=window;window.top=iframe?{}:window;
 window.addEventListener=(name,fn)=>windowEvents.set(name,fn);
 const createElement=tag=>{
  const e={tag,id:'',type:'',disabled:false,isConnected:false,title:'',textContent:'',style:{cssText:''},listeners:{},
   setAttribute(k,v){this[k]=v;},
   addEventListener(type,fn){this.listeners[type]=fn;},
   remove(){this.isConnected=false;nodes.delete(this.id);}
  };
  return e;
 };
 const appendChild=e=>{appendLog.push(e);e.isConnected=true;if(e.id)nodes.set(e.id,e);return e};
 const document={
  readyState:'complete',
  addEventListener(){},
  getElementById:id=>nodes.get(id)||null,
  createElement,
  head:{appendChild},
  body:{appendChild},
  documentElement:{appendChild}
 };
 class MutationObserver{constructor(cb){this.cb=cb;observers.push(this)}observe(){}}
 const location={hostname:host,pathname,protocol};
 const context={document,window,location,Set,MutationObserver};
 vm.runInNewContext(src,context);
 const button=()=>nodes.get('bbpFirefoxOneTapLauncher');
 const tick=()=>observers.forEach(x=>x.cb());
 return {window,location,document,nodes,appendLog,button,tick,windowEvents,observers,context};
}
test('official /plus and /live pages show a fixed launcher but do not auto-load ordering',()=>{
 for(const p of ['/plus','/plus/','/live','/live/']){
  const x=browser({pathname:p});
  assert.ok(x.button(),'missing launcher on '+p);
  assert.match(x.button().style.cssText,/position:fixed;top:34%;left:8px/);
  assert.equal(x.appendLog.filter(n=>n.tag==='script').length,0);
  assert.match(x.button().textContent,/주문 도우미/);
 }
});
test('do not insert on another host, non-HTTPS, unrelated page, or iframe',()=>{
 for(const x of [
  browser({host:'payapp.kr'}),browser({pathname:'/settings'}),browser({pathname:'/plus/other'}),
  browser({protocol:'http:'}),browser({iframe:true})
 ])assert.equal(x.button(),undefined);
});
test('SPA navigation into the official store creates launcher without full reload',()=>{
 const x=browser({pathname:'/'});
 assert.equal(x.button(),undefined);
 x.location.pathname='/plus';x.tick();
 assert.ok(x.button());
 x.location.pathname='/live';x.tick();
 assert.ok(x.button());
 x.location.pathname='/other';x.tick();
 assert.equal(x.button(),undefined);
});
test('after app-root rerender removes the launcher, observer reattaches exactly once',()=>{
 const x=browser();
 const old=x.button();
 old.remove();
 assert.equal(x.button(),undefined);
 x.tick();
 assert.equal(x.button(),old);
 const count=x.appendLog.length;
 x.tick();x.tick();
 assert.equal(x.appendLog.length,count);
});
test('a real user tap loads the same pinned helper once; no auto ordering',()=>{
 const x=browser(),tap=x.button().listeners.click;
 tap();tap();
 const scripts=x.appendLog.filter(n=>n.tag==='script');
 assert.equal(scripts.length,1);
 assert.match(scripts[0].src,/bebepick-quick-order-general-v24\.js\?v=20261025-v24-conditional-700-900-v16/);
 assert.equal(x.button().disabled,true);
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|\.click\s*\(|dispatchEvent|credit.?card|cardnumber|cvv|create_order|payapp\.kr/i);
});
test('once helper is loaded, another tap shows its panel without another source script',()=>{
 const x=browser();x.button().listeners.click();
 let shown=0;x.window.__bbpGeneralQuickV24={show:()=>shown++};
 const script=x.nodes.get('bbpFirefoxOneTapHelperSource');
 script.listeners.load();
 assert.equal(x.button().disabled,false);
 x.button().listeners.click();
 assert.equal(shown,1);
 assert.equal(x.appendLog.filter(n=>n.tag==='script').length,1);
});
test('failed source load leaves an explicit retry without automatic clicks',()=>{
 const x=browser();x.button().listeners.click();
 const first=x.nodes.get('bbpFirefoxOneTapHelperSource');
 first.listeners.error();
 assert.equal(x.nodes.has('bbpFirefoxOneTapHelperSource'),false);
 assert.equal(x.button().disabled,false);
 x.button().listeners.click();
 assert.equal(x.appendLog.filter(n=>n.tag==='script').length,2);
});
test('script matches the site broadly but runtime allowlists only the two order routes',()=>{
 assert.match(src,/\/\/ @grant\s+none/);
 assert.match(src,/\/\/ @noframes/);
 assert.match(src,/\/\/ @match\s+https:\/\/bebepick\.me\/\*/);
 assert.match(src,/const VALID_PATHS=new Set\(\['\/live','\/live\/','\/plus','\/plus\/'\]\)/);
 assert.match(src,/new MutationObserver\(syncLauncher\)/);
 assert.match(src,/button\.addEventListener\('click'/);
 assert.doesNotMatch(src,/button\.click\(\)/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
