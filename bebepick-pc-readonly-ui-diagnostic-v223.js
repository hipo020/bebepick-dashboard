(function(){
"use strict";
// PC diagnosis ONLY. Reads order_windows/list_products and official DOM.
// No cart writes, state mutation, clicks, checkout or payment requests.
const store=/^\/plus\/?$/.test(location.pathname)?"china":/^\/live\/?$/.test(location.pathname)?"main":null;
if(location.hostname!=="bebepick.me"||!store){alert("베베픽 /plus 또는 /live 공식 페이지에서 실행해 줘.");return;}
if(window.__bbpReadOnlyUiDiag223){window.__bbpReadOnlyUiDiag223.show();return;}
if(window.__bbpGeneralQuickV2||window.__bbpGeneralQuickV23||window.__bbpRabbitFast||window.__bbpGeneralQuickV1){
 alert("실주문 자동화와 진단을 동시에 실행하지 않도록 자동주문을 중지하고 홈페이지를 새로고침한 뒤 시작해 줘.");return;
}
const uid="bbpReadOnlyUiDiag223",root=document.createElement("aside");
root.id=uid;root.style.cssText="position:fixed;right:12px;bottom:12px;width:min(440px,calc(100vw - 24px));max-height:74vh;overflow:auto;z-index:2147483640;padding:13px;border:2px solid #7e55b0;border-radius:14px;background:#fff;color:#342b41;font:13px/1.45 system-ui,sans-serif;box-shadow:0 6px 30px #0004";
root.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>🧪 베베픽 PC 진단 v2.2.3 · 읽기 전용</strong><button type="button" id="dCollapse" style="border:0;background:white;font-size:20px">−</button></div>'+
'<p style="font-size:12px;color:#725e88;margin:6px 0">주문 버튼을 누르지 않고 서버 ON/OFF와 공식 화면 갱신 차이를 기록해.</p>'+
'<div id="dBody">'+
'<div style="display:flex;gap:8px;flex-wrap:wrap">'+
'<label style="flex:1;min-width:120px">상품 코드 (선택)<input id="dSku" type="text" placeholder="예: D706" maxlength="24" style="width:100%;box-sizing:border-box;padding:7px;border:1px solid #c9b7d8;border-radius:8px"></label>'+
'<label style="width:116px">조회 간격<select id="dPeriod" style="width:100%;padding:7px;border:1px solid #c9b7d8;border-radius:8px"><option value="8">8초 권장</option><option value="5">5초</option><option value="15">15초</option></select></label></div>'+
'<div style="margin-top:8px;display:flex;gap:7px"><button type="button" id="dStart" style="flex:1;background:#7350ac;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700">진단 시작</button>'+
'<button type="button" id="dStop" style="border:1px solid #c3afd6;background:white;border-radius:8px;padding:10px">중지</button></div>'+
'<div id="dStatus" style="margin-top:8px;padding:8px;background:#f5effb;border-radius:8px;font-weight:650">대기 중 · 아직 어떤 서버 요청도 보내지 않았어</div>'+
'<div id="dSummary" style="font-size:12px;margin:7px 0;white-space:pre-wrap">서버 상태 — / 공식 주문 표시 — / 장바구니 버튼 —</div>'+
'<details><summary style="cursor:pointer;font-weight:700">⏱️ 변화 기록 펼치기</summary><pre id="dEvents" style="white-space:pre-wrap;overflow:auto;max-height:165px;font:11px/1.5 monospace"></pre></details>'+
'<div style="display:flex;gap:7px;margin-top:9px"><button id="dCopy" type="button" style="border:1px solid #c5b1d8;background:white;padding:8px;border-radius:8px">📋 기록 복사</button>'+
'<button id="dJson" type="button" style="border:1px solid #c5b1d8;background:white;padding:8px;border-radius:8px">💾 JSON 저장</button></div>'+
'<p style="font-size:11px;color:#746680;margin:8px 0 0">진단은 GET처럼 읽기 용도의 공식 RPC 두 종류만 호출해. 상품 코드가 비어 있으면 order_windows만 조회해. 주문·결제·장바구니·동의 클릭 없음. 새로고침하면 진단 종료.</p></div>';
document.body.append(root);
const $=x=>root.querySelector(x),panel=$("#dBody"),status=$("#dStatus"),summary=$("#dSummary"),log=$("#dEvents");
let running=false,requesting=false,timer=null,domTimer=null,controller=null,startedAt="",beginMs=0,lastServer=null,lastDom=null,lastStock=null,lastCheckAt=null,errorCount=0,rounds=0,events=[],sku="";
const now=()=>new Date().toISOString(),perf=()=>Math.round(performance.now()*10)/10;
function logEvent(kind,details){
 const ev={at:now(),elapsedMs:Math.round((perf()-beginMs)*10)/10,event:kind,...details};
 events.push(ev);if(events.length>250)events.shift();
 log.textContent=events.slice(-25).map(x=>x.at.slice(11,23)+" "+x.event+" "+JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>!["at","elapsedMs","event"].includes(k))))).join("\n");
}
function visible(el){return !!(el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=="none"&&getComputedStyle(el).visibility!=="hidden");}
function stateOfDom(){
 const bar=document.querySelector("#storeBar .sb-order"),barOpen=!!(bar&&bar.classList.contains("open"));
 const cartButton=document.querySelector("#cartBar .cb-submit")||document.querySelector("#btnTopCart:not([hidden])");
 const productButton=sku?document.querySelector('[data-ctl="'+sku+'"]'):null;
 const card=productButton&&productButton.closest(".prod");
 const cart=document.querySelector('.panel[data-sheet="cart"]');
 const checkout=cart&&cart.querySelector("#checkout");
 return {officialOrderBar:bar?(barOpen?"open":"closed"):"missing",
  cartButton:!cartButton?"missing":(cartButton.disabled?"disabled":"enabled"),
  cartButtonVisible:visible(cartButton),
  productCard:!sku?"not-selected":!card?"missing":card.classList.contains("soldout")?"soldout":card.classList.contains("fbout")?"fullbox-out":"shown",
  checkoutButton:!checkout?"missing":checkout.disabled?"disabled":"enabled",
  checkoutVisible:visible(checkout)};
}
function checkDom(){
 if(!running)return;
 const d=stateOfDom(),value=JSON.stringify(d);
 if(value!==lastDom){lastDom=value;logEvent("official_dom_change",{dom:d});display(d);}
}
function display(d){
 const parsed=d||stateOfDom();
 summary.textContent="서버 접수: "+(lastServer===null?"아직 미확인":lastServer?"ON":"OFF")+
  "\n홈페이지 상단: "+parsed.officialOrderBar+
  " · 주문 버튼: "+parsed.cartButton+
  (sku?"\n"+sku+" 상품 카드: "+parsed.productCard+" · 서버 재고: "+(lastStock===null?"미확인":lastStock):"")+
  "\n조회 "+rounds+"회 · 오류 "+errorCount+"회"+
  (lastCheckAt?" · 최근 "+lastCheckAt.slice(11,19)+" UTC":"");
}
function config(){
 const c=window.APP_CONFIG||{};
 if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error("공식 홈페이지 서버 설정을 찾을 수 없어");
 const host=new URL(c.supabaseUrl).hostname;
 if(host!=="eqytdtxemjlygnobhiio.supabase.co")throw Error("예상 외의 공식 서버 URL이야");
 return {base:c.supabaseUrl.replace(/\/$/,""),anon:c.supabaseAnonKey};
}
async function rpc(name,args,ctrl){
 const cfg=config(),headers={"apikey":cfg.anon,"Content-Type":"application/json","Accept":"application/json"};
 // Only use the site's existing session in-memory; never save or export it.
 try{
  const item=JSON.parse(localStorage.getItem("sb-eqytdtxemjlygnobhiio-auth-token")||"null");
  if(item&&typeof item.access_token==="string"&&Number(item.expires_at)>Date.now()/1000+10)headers.authorization="Bearer "+item.access_token;
 }catch(e){}
 const res=await fetch(cfg.base+"/rest/v1/rpc/"+name,{method:"POST",headers,body:JSON.stringify(args),mode:"cors",cache:"no-store",credentials:"omit",signal:ctrl.signal});
 if(!res.ok)throw Error(name+" HTTP "+res.status);
 return res.json();
}
function schedule(ms){if(timer)clearTimeout(timer);if(running)timer=setTimeout(poll,ms);}
async function poll(){
 if(!running||requesting)return;
 if(document.hidden){status.textContent="⏸️ 탭이 백그라운드라 서버 조회 일시 정지";schedule(1000);return;}
 requesting=true;controller=new AbortController();
 const ctrl=controller,cycle=Number($("#dPeriod").value)||8,timeout=setTimeout(()=>ctrl.abort(),7500),at=perf();
 try{
  const requested=[rpc("order_windows",{},ctrl)];
  if(sku)requested.push(rpc("list_products",{p_brand:store},ctrl));
  const result=await Promise.all(requested);
  if(!running||ctrl!==controller)return;
  rounds++;lastCheckAt=now();
  const w=result[0]&&result[0][store];
  if(!w||typeof w.open!=="boolean"&&typeof w.yt_live!=="boolean")throw Error("주문 상태 응답 형식 오류");
  const ok=!!(w.reason!=="paused"&&((w.open===true&&w.enabled!==false&&w.closed!==true)||w.yt_live===true));
  if(lastServer===null||ok!==lastServer)logEvent(lastServer===null?"server_initial":"server_transition",{open:ok,from:lastServer,to:ok});
  lastServer=ok;
  if(sku){
   const p=Array.isArray(result[1])?result[1].find(x=>x.sku===sku&&(!x.only||x.only===store)):null;
   const stock=p?("stock:"+String(p.stock??"available")+";fullbox_out:"+Boolean(p.fullbox_out)):"not-in-list";
   if(stock!==lastStock){lastStock=stock;logEvent("product_list_change",{sku,stock});}
  }
  const dom=stateOfDom();
  if(dom.officialOrderBar==="closed"&&ok)logEvent("server_on_dom_closed",{dom:dom.officialOrderBar,latencyMs:Math.round((perf()-at)*10)/10});
  status.textContent="✅ 서버 조회 "+Math.round(perf()-at)+"ms · 주문 상태 "+(ok?"ON":"OFF")+" · 주문/클릭 0회";
  display(dom);checkDom();
 }catch(e){
  if(!running)return;
  errorCount++;logEvent("read_error",{message:String(e.message||e).slice(0,140)});
  status.textContent="⚠ 조회 오류 · "+String(e.message||e).slice(0,80);
 }finally{
  clearTimeout(timeout);if(ctrl===controller)controller=null;
  requesting=false;if(running)schedule(cycle*1000);
 }
}
function stop(){
 running=false;if(timer)clearTimeout(timer);timer=null;
 if(domTimer)clearInterval(domTimer);domTimer=null;
 if(controller)controller.abort();controller=null;
 status.textContent="⏹ 진단 중지 · 주문 클릭 0회";if(startedAt)logEvent("stopped",{});
}
function output(){return {kind:"bebepick-read-only-ui-diagnostic",version:"2.2.3",createdAt:now(),store,sku:sku||null,startedAt,checks:rounds,errors:errorCount,events:events.slice(),note:"Diagnostic only. Official frontend state may lag server status. No checkout, cart, authorization token or order number included."};}
$("#dStart").onclick=()=>{
 if(running)return;
 sku=$("#dSku").value.trim().toUpperCase();
 if(sku&&!/^[A-Z0-9_-]{1,24}$/.test(sku)){status.textContent="⚠ 상품 코드는 영어·숫자·_·-만 입력해 줘";return;}
 startedAt=now();beginMs=perf();events=[];rounds=0;errorCount=0;lastServer=null;lastDom=null;lastStock=null;lastCheckAt=null;running=true;
 $("#dSku").disabled=true;$("#dPeriod").disabled=true;
 logEvent("started",{intervalSeconds:Number($("#dPeriod").value),sku:sku||null});
 domTimer=setInterval(checkDom,250);checkDom();poll();
};
$("#dStop").onclick=()=>{stop();$("#dSku").disabled=false;$("#dPeriod").disabled=false;};
$("#dCopy").onclick=async()=>{
 try{await navigator.clipboard.writeText(JSON.stringify(output(),null,2));status.textContent="✅ 진단 기록 복사 완료 · 주문 클릭 0회";}
 catch(e){status.textContent="복사 권한이 없으면 JSON 저장 버튼을 눌러 줘";}
};
$("#dJson").onclick=()=>{
 const blob=new Blob([JSON.stringify(output(),null,2)],{type:"application/json"});
 const href=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=href;a.download="bebepick-ui-diagnostic-v223-"+new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")+".json";
 a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
$("#dCollapse").onclick=()=>{
 const hidden=panel.hidden;panel.hidden=!hidden;
 $("#dCollapse").textContent=hidden?"−":"+";
};
document.addEventListener("visibilitychange",()=>{if(running&&!document.hidden){checkDom();schedule(0);}});
window.addEventListener("pagehide",stop,{once:true});
window.__bbpReadOnlyUiDiag223={show:()=>{root.hidden=false;panel.hidden=false;},stop};
})();