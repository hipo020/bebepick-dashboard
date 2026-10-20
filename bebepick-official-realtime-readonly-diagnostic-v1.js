(function(){
"use strict";
// OBSERVER ONLY. Never call order/cart RPC or open checkout.
// One same-origin GET of the site's own app.js checks for possible Realtime APIs.
const host=location.hostname,validRoute=/^\/(live|plus)\/?$/.test(location.pathname);
if(host!=="bebepick.me"||!validRoute){alert("베베픽 공식 /live 또는 /plus 페이지에서 실행해 줘.");return;}
if(window.__bbpOfficialRealtimeProbeV1){window.__bbpOfficialRealtimeProbeV1.show();return;}
const root=document.createElement("aside");
root.id="bbpOfficialRealtimeProbeV1";
root.style.cssText="position:fixed;bottom:12px;left:10px;right:10px;margin:auto;z-index:2147483646;max-width:520px;max-height:81dvh;overflow:auto;background:#fff;color:#30283c;border:2px solid #9270bc;border-radius:14px;box-shadow:0 8px 28px #0005;padding:13px;font:13px/1.55 system-ui,sans-serif";
root.innerHTML=
'<strong>🔎 베베픽 실시간 신호 · 읽기 전용 진단 v1</strong>'+
'<p style="margin:5px 0;color:#6c6078">공식 서버에 반복 조회·주문 요청 0회. 앱 코드만 1회 읽고 홈페이지 자체 갱신을 관찰해.</p>'+
'<label>관찰할 인형 코드 (선택)<input id="bbpDiagSku" placeholder="예: D796" maxlength="24" style="box-sizing:border-box;width:100%;padding:8px;margin:4px 0;border:1px solid #c6bad5;border-radius:7px"></label>'+
'<div id="bbpDiagStatus" style="padding:7px;border-radius:8px;background:#f4eefb">앱 코드 확인을 준비 중…</div>'+
'<div style="display:flex;gap:7px;margin:8px 0"><button id="bbpDiagCopy" style="padding:8px;border-radius:8px;border:1px solid #a592be;background:#f4eefb">진단 결과 복사</button><button id="bbpDiagStop" style="padding:8px;border-radius:8px;border:1px solid #bcaebf;background:#fff">관찰 종료</button></div>'+
'<pre id="bbpDiagLog" style="white-space:pre-wrap;word-break:break-word;margin:6px 0;max-height:170px;overflow:auto;background:#faf9fb;padding:8px;border-radius:7px;font:11px/1.6 ui-monospace,monospace"></pre>'+
'<small>실시간 API 참조 코드가 있다는 사실만으로 실제 구독·전달이 보장되지는 않아. 네트워크 감지 시간도 홈페이지 요청의 관측 시각이야. 알림·결제 정보나 토큰은 수집하지 않아.</small>';
document.body.appendChild(root);
const el=id=>root.querySelector("#"+id);
const state={startedAt:new Date().toISOString(),page:location.pathname,script:null,signals:[],network:[],dom:[],errors:[],stopped:false};
const stamp=()=>new Date().toISOString();
const maxAdd=(array,item,limit=120)=>{if(array.length>=limit)array.shift();array.push(item);};
const log=(msg)=>{maxAdd(state.signals,{at:stamp(),message:msg},80);el("bbpDiagLog").textContent=state.signals.slice(-12).map(x=>x.at.slice(11,23)+" "+x.message).join("\n");};
const setStatus=t=>el("bbpDiagStatus").textContent=t;
const classifyResource=(url)=>{
 try{
  const u=new URL(url),name=u.pathname.match(/\/rest\/v1\/rpc\/([a-z_]+)/i)?.[1];
  if(u.host!=="eqytdtxemjlygnobhiio.supabase.co")return null;
  if(name==="list_products"||name==="order_windows")return name;
 }catch(e){}
 return null;
};
const seen=new Set();
function capture(entry){
 const kind=classifyResource(entry.name);
 if(!kind)return;
 const t=new Date(performance.timeOrigin+entry.startTime).toISOString();
 const key=kind+"|"+entry.startTime.toFixed(2);
 if(seen.has(key))return;
 seen.add(key);
 maxAdd(state.network,{at:t,kind,durationMs:Math.round(entry.duration*10)/10});
 log("페이지 RPC 관측 "+kind+" ("+Math.round(entry.duration)+"ms)");
}
let observer=null,domObserver=null,domTimer=null;
try{
 performance.getEntriesByType("resource").forEach(capture);
 observer=new PerformanceObserver(list=>list.getEntries().forEach(capture));
 observer.observe({type:"resource",buffered:true});
}catch(e){state.errors.push("resource-observer-unavailable");}
function snapshot(){
 const sku=el("bbpDiagSku").value.trim().toUpperCase();
 let card=null;
 if(/^[A-Z0-9-]{2,24}$/.test(sku)){
  for(const n of document.querySelectorAll("[data-ctl]")){
   if(n.getAttribute("data-ctl")===sku){card=n.closest(".prod");break;}
  }
 }
 return {
  at:stamp(),
  sku:sku||null,
  visibleCard:!!card,
  soldout:card?card.classList.contains("soldout"):null,
  fullboxOut:card?card.classList.contains("fbout"):null,
  siteOrderOpen:!!document.querySelector("#storeBar .sb-order.open"),
  checkoutButtonEnabled:(()=>{const b=document.querySelector("#cartBar .cb-submit")||document.querySelector("#btnTopCart:not([hidden])");return b?!b.disabled:null;})()
 };
}
let lastSnapshot="";
function captureDom(){
 const value=snapshot();
 const key=JSON.stringify({...value,at:""});
 if(key===lastSnapshot)return;
 lastSnapshot=key;
 maxAdd(state.dom,value);
 log("화면 변경 "+(value.sku||"전체")+" · 카드 "+(value.visibleCard?"있음":"없음")+" · 품절 "+String(value.soldout)+" · 주문탭 "+(value.siteOrderOpen?"열림":"닫힘"));
}
el("bbpDiagSku").addEventListener("change",captureDom);
try{
 domObserver=new MutationObserver(()=>{
  if(domTimer)return;
  domTimer=setTimeout(()=>{domTimer=null;if(!state.stopped)captureDom();},200);
 });
 domObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","disabled","hidden"]});
}catch(e){state.errors.push("dom-observer-unavailable");}
captureDom();
const analyze=(s)=>{
 const count=re=>[...s.matchAll(re)].length;
 return {
  sizeBytes:s.length,
  appChannelCalls:count(/(?:\.\s*channel|\[\s*["']channel["']\s*\])\s*\(/g),
  postgresChangesMentions:count(/postgres_changes/g),
  realtimeMentions:count(/\brealtime\b/ig),
  rawWebSocketMentions:count(/\bWebSocket\b/g),
  eventSourceMentions:count(/\bEventSource\b/g),
  productRpcMentions:count(/list_products/g),
  orderWindowMentions:count(/order_windows/g),
  // Heuristic only. The presence of supabase.js alone is not evidence.
  hasPotentialRealtimeCode:/(postgres_changes|(?:\.\s*channel)\s*\(|\bEventSource\b|\bWebSocket\b)/.test(s)
 };
};
async function scanAppJs(){
 const node=[...document.scripts].find(s=>{try{return new URL(s.src,location.href).pathname==="/app.js";}catch{return false;}});
 if(!node){state.script={status:"not-found"};setStatus("공식 app.js 주소를 찾지 못했어 · 네트워크/화면 관찰은 계속해");return;}
 const u=new URL(node.src,location.href);
 if(u.origin!==location.origin){state.script={status:"cross-origin-skip"};return;}
 try{
  const resp=await fetch(u.toString(),{method:"GET",cache:"force-cache",credentials:"same-origin"});
  if(!resp.ok)throw new Error("HTTP "+resp.status);
  const body=await resp.text();
  if(body.length>2500000)throw new Error("script-size-limit");
  const info=analyze(body);
  state.script={status:"analyzed",...info};
  setStatus(info.hasPotentialRealtimeCode?
   "🔎 앱 코드에서 실시간 관련 흔적 발견 · 실제 구독 여부는 추가 검증 필요":
   "📋 앱 코드에서 뚜렷한 실시간 구독 흔적 미발견 · 폴링 여부 관찰 중");
  log("공식 app.js 분석 완료 · 실시간 참조 "+(info.hasPotentialRealtimeCode?"있음":"뚜렷하지 않음"));
 }catch(e){state.script={status:"read-failed"};state.errors.push("appjs-read-failed");setStatus("앱 코드 읽기 실패 · 화면/네트워크 관찰은 계속해");}
}
function report(){
 return {kind:"bebepick-official-readonly-diagnostic-v1",generatedAt:stamp(), ...state,
  note:"Only own observed timing. Never proof of LIVE start or a reliable backend real-time event."};
}
el("bbpDiagCopy").addEventListener("click",async()=>{
 const safe=JSON.stringify(report(),null,2);
 try{await navigator.clipboard.writeText(safe);log("✅ 진단 결과가 복사됐어 · 채팅에 붙여넣어 줘");}
 catch(e){const t=document.createElement("textarea");t.value=safe;t.style.cssText="width:100%;height:130px";root.appendChild(t);t.select();setStatus("복사가 막혀서 아래에 결과를 표시했어. 전체 선택 후 복사해 줘.");}
});
function stop(){
 if(state.stopped)return;
 state.stopped=true;
 try{observer?.disconnect();domObserver?.disconnect();if(domTimer)clearTimeout(domTimer);}catch(e){}
 window.__bbpOfficialRealtimeProbeV1=null;
 root.remove();
}
el("bbpDiagStop").addEventListener("click",stop);
window.__bbpOfficialRealtimeProbeV1={show:()=>{root.style.display="block";},stop,report};
log("진단 시작 · 공식 서버의 상태 RPC 추가 요청 0회");
scanAppJs();
})();