// ==UserScript==
// @name         베베픽 · 상품 목록 읽기 전용 진단
// @namespace    https://hipo020.github.io/bebepick-dashboard/
// @version      0.1.0
// @description  기존 상품 목록 요청의 상태와 헤더 유무만 비교합니다. 추가 조회·주문·토큰 수집 없음.
// @match        https://bebepick.me/live
// @match        https://bebepick.me/live/
// @match        https://bebepick.me/plus
// @match        https://bebepick.me/plus/
// @run-at       document-start
// @noframes
// @grant        none
// @downloadURL  https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-catalog-diagnostic.user.js
// @updateURL    https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-catalog-diagnostic.user.js
// ==/UserScript==
(function(){
 'use strict';
 if(location.protocol!=='https:'||location.hostname!=='bebepick.me'||!/^\/(live|plus)\/?$/.test(location.pathname)||window.top!==window.self)return;
 if(window.__bbpCatalogReadDiagnosticV1||typeof window.fetch!=='function')return;
 const original=window.fetch,started=performance.now(),records=[];
 let observing=true,phase='before_helper_open',panel=null,status=null,output=null,toggle=null;
 const hasHeader=(headers,name)=>{
  if(!headers)return false;
  if(typeof headers.has==='function')return headers.has(name);
  if(Array.isArray(headers))return headers.some(pair=>Array.isArray(pair)&&String(pair[0]).toLowerCase()===name);
  return Object.keys(headers).some(key=>key.toLowerCase()===name);
 };
 function metadata(input,init){
  try{
   const url=new URL(typeof input==='string'||input instanceof URL?String(input):input?.url,location.href);
   if(url.origin!=='https://eqytdtxemjlygnobhiio.supabase.co'||url.pathname!=='/rest/v1/rpc/list_products')return null;
   const method=String(init?.method||input?.method||'GET').toUpperCase();if(!['GET','POST'].includes(method))return null;
   const headers=init?.headers===undefined?input?.headers:init.headers;
   let brand=null;
   if(typeof init?.body==='string'&&init.body.length<=1000){try{const value=JSON.parse(init.body).p_brand;if(['main','china'].includes(value))brand=value;}catch{}}
   // Never read header values, request streams, auth storage, or successful response bodies.
   return {phase,channel:location.pathname.startsWith('/plus')?'plus':'live',method,brand,
    auth_header_present:hasHeader(headers,'authorization'),api_key_header_present:hasHeader(headers,'apikey'),
    client_header_present:hasHeader(headers,'x-client-info'),
    credentials_option:['omit','include','same-origin'].includes(init?.credentials)?init.credentials:'browser_default',
    elapsed_ms:Math.round(performance.now()-started),http_status:null,result:'pending'};
  }catch{return null;}
 }
 function report(){
  return {diagnostic_version:'0.1.0',observing,request_count:records.length,
   before_helper_count:records.filter(r=>r.phase==='before_helper_open').length,
   after_helper_count:records.filter(r=>r.phase==='after_helper_open').length,
   helper_version:typeof window.__bbpGeneralQuickV24?.version==='string'?window.__bbpGeneralQuickV24.version.replace(/[^\d.]/g,'').slice(0,20):null,
   records:records.map(r=>({...r}))};
 }
 function render(){
  if(!panel)return;
  const before=records.filter(r=>r.phase==='before_helper_open'),after=records.filter(r=>r.phase==='after_helper_open');
  status.textContent=(observing?'진단 기록 중':'진단 기록 중지')+' · 도우미 열기 전 '+before.length+'건 / 연 뒤 '+after.length+'건'+
   (!before.length?'\n공식 화면의 요청을 아직 기록하지 못했어. 이 상태만으로 비교 결론을 내리지 않아.':'')+
   '\n추가 서버 요청·주문은 하지 않아. 로그인 정보·인형 이름·가격은 기록하지 않아.';
  output.value=JSON.stringify(report(),null,2);
 }
 function observe(response,record){
  record.http_status=Number(response.status)||0;record.result=response.ok?'http_ok':'http_error';
  // Error names only; do not retain or display the vendor's raw error response.
  if(!response.ok){
   let clone;try{clone=response.clone();}catch{render();return;}
   try{clone.json().then(body=>{
    if(body?.message==='origin_rejected'||body?.code==='origin_rejected')record.result='origin_rejected';
    else if(['PGRST301','42501','P0001'].includes(body?.code))record.result=body.code;
    render();
   }).catch(()=>{});}catch{}
  }
  render();
 }
 function wrapped(input,init){
  let record=null;if(observing){record=metadata(input,init);if(record){records.push(record);if(records.length>20)records.shift();render();}}
  // Call the existing fetch exactly once with the identical receiver and arguments.
  const pending=Reflect.apply(original,this,arguments);
  if(record){Promise.resolve(pending).then(response=>{try{observe(response,record);}catch{}},()=>{record.result='network_error';render();});}
  return pending;
 }
 window.fetch=wrapped;
 function stop(){observing=false;if(window.fetch===wrapped)window.fetch=original;render();}
 function phaseChange(event){if(event.target?.closest?.('#bbpFirefoxOneTapLauncher')){phase='after_helper_open';render();}}
 document.addEventListener('click',phaseChange,true);
 const api={report,stop};window.__bbpCatalogReadDiagnosticV1=api;
 function mount(){
  if(!document.body||document.getElementById('bbpCatalogReadDiagnostic'))return;
  toggle=document.createElement('button');toggle.type='button';toggle.textContent='🔎 목록 진단';toggle.style.cssText='position:fixed;right:8px;top:8px;z-index:2147483647;border:1px solid #b9a9ce;border-radius:12px;padding:9px;background:#fff;color:#573579;font:700 12px system-ui';
  panel=document.createElement('aside');panel.id='bbpCatalogReadDiagnostic';panel.hidden=true;panel.style.cssText='position:fixed;z-index:2147483647;inset:54px 8px auto;max-width:520px;max-height:78dvh;overflow:auto;margin:auto;padding:17px;box-sizing:border-box;background:#fff;color:#322638;border:1px solid #d7c8e7;border-radius:17px;box-shadow:0 10px 40px #30203944;font:14px/1.7 system-ui';
  const title=document.createElement('strong');title.textContent='상품 목록 · 읽기 전용 진단';
  const help=document.createElement('p');help.textContent='업데이트 후 이 상품 페이지를 한 번 새로고침하고, 인형이 표시되면 평소처럼 주문 도우미만 열어 줘. 대기 시작은 누르지 않아도 돼. 그다음 결과를 복사해 보내 줘.';
  status=document.createElement('p');status.style.whiteSpace='pre-line';status.setAttribute('role','status');
  output=document.createElement('textarea');output.readOnly=true;output.setAttribute('aria-label','비밀정보를 제외한 목록 진단 결과');output.style.cssText='width:100%;height:190px;box-sizing:border-box;font:11px/1.6 monospace;border:1px solid #ddd;border-radius:8px;padding:8px';
  const copy=document.createElement('button');copy.type='button';copy.textContent='진단 결과 복사';
  copy.onclick=async()=>{output.value=JSON.stringify(report(),null,2);try{await navigator.clipboard.writeText(output.value);copy.textContent='복사했어 · 채팅에 붙여넣기';}catch{output.focus();output.select();copy.textContent='선택된 결과를 길게 눌러 복사해 줘';}};
  const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>{panel.hidden=true;};
  const end=document.createElement('button');end.type='button';end.textContent='진단 기록 중지';end.onclick=stop;
  for(const button of [copy,close,end])button.style.cssText='min-height:42px;margin:8px 6px 0 0;padding:8px 12px;border:1px solid #cab8dd;border-radius:9px;background:#f6effc;color:#573579;font:inherit';
  toggle.onclick=()=>{panel.hidden=!panel.hidden;render();};panel.append(title,help,status,output,copy,close,end);document.body.append(toggle,panel);render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
