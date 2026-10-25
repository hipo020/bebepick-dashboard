// ==UserScript==
// @name         베베픽 · PAYAPP 결제수단 선택 도우미 (카드입력 기본)
// @namespace    https://hipo020.github.io/bebepick-dashboard/
// @version      0.1.0
// @description  PAYAPP 공식 결제 화면에서 결제 경로를 직접 선택. 카드정보·인증·결제승인은 수동.
// @match        https://payapp.kr/WEBPAY_INPUT/*
// @run-at       document-idle
// @noframes
// @grant        none
// @downloadURL  https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-payapp-methods.user.js
// @updateURL    https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-payapp-methods.user.js
// ==/UserScript==

(function(){
 'use strict';
 if(location.protocol!=='https:'||location.hostname!=='payapp.kr'||
    !/^\/WEBPAY_INPUT\//.test(location.pathname)||window.top!==window.self)return;

 // No card information, passwords, identity data, PINs, CVC, page URLs or
 // payment metadata are read, cached, copied, logged or sent by this helper.
 // Persist only the harmless preferred payment METHOD in the user's browser.
 const PREF_KEY='bbp_payapp_method_v1';
 const choices=[
  {id:'card',name:'💳 카드번호 직접입력 (기본)',route:['신용/체크 카드','신용/체크카드'],sub:['카드번호 및 유효기간 입력']},
  {id:'isp',name:'🔐 ISP/안심클릭',route:['신용/체크 카드','신용/체크카드'],sub:['ISP/안심클릭']},
  {id:'naver',name:'네이버페이',route:['N pay','Npay','네이버페이']},
  {id:'kakao',name:'카카오페이',route:['카카오페이','kakao pay','KakaoPay']},
  {id:'toss',name:'토스페이',route:['toss pay','tosspay','토스페이']},
  {id:'smile',name:'스마일페이',route:['SmilePay','스마일페이']},
  {id:'payco',name:'페이코',route:['PAYCO','페이코']},
  {id:'apple',name:'애플페이',route:['Apple Pay','애플페이']},
  {id:'bank',name:'계좌이체',route:['계좌이체']}
 ];
 const norm=s=>String(s||'').normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase();
 const stored=()=>{try{const id=localStorage.getItem(PREF_KEY);return choices.some(x=>x.id===id)?id:'card';}catch{return 'card';}};
 const save=id=>{try{localStorage.setItem(PREF_KEY,id);}catch{/* private mode */}};
 let chosen=stored(), lastActionStage='',lastActionMode='';
 const host=document.createElement('div');
 host.id='bbpPayappMethodHelper';
 host.style.cssText='position:fixed;right:8px;top:10px;z-index:2147483629;font-family:system-ui,sans-serif;max-width:calc(100vw - 16px);';
 const shadow=host.attachShadow({mode:'open'});
 const style=document.createElement('style');
 style.textContent='*{box-sizing:border-box}button,select{font:inherit}button{border:0;cursor:pointer;border-radius:10px;padding:9px 11px}#launcher{background:#7453a5;color:#fff;font-size:12px;font-weight:750;box-shadow:0 3px 12px #0003}#panel{width:min(310px,calc(100vw - 20px));background:#fff;color:#34263e;border:1px solid #decfed;border-radius:14px;padding:14px;box-shadow:0 8px 28px #0003;margin-top:7px;line-height:1.55}h2{font-size:15px;margin:0 0 9px}p{font-size:12px;margin:7px 0}select{width:100%;border:1px solid #d6c7eb;border-radius:10px;background:white;color:#34263e;padding:10px;font-size:14px}#go{width:100%;margin-top:9px;background:#7653aa;color:white;font-weight:700}#status{color:#6c547e}#notice{color:#a13a50}#close{float:right;background:#f3edfa;color:#604482;font-size:12px;padding:5px 9px}#panel[hidden]{display:none}';
 const launch=document.createElement('button');launch.type='button';launch.id='launcher';launch.textContent='💳 결제 방식';
 const panel=document.createElement('section');panel.id='panel';panel.hidden=true;panel.setAttribute('aria-label','결제수단 선택 보조 도구');
 const close=document.createElement('button');close.type='button';close.id='close';close.textContent='닫기';
 const title=document.createElement('h2');title.textContent='결제수단 선택 도우미';
 const desc=document.createElement('p');desc.textContent='카드번호 직접입력이 기본이야. 현재 단계의 선택지만 눌러주고, 카드·인증 정보와 최종 결제는 직접 진행해.';
 const select=document.createElement('select');select.setAttribute('aria-label','선호 결제수단');
 for(const c of choices){const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.name;select.appendChild(opt);}
 select.value=chosen;
 const go=document.createElement('button');go.type='button';go.id='go';go.textContent='현재 화면에서 선택한 경로로 이동';
 const status=document.createElement('p');status.id='status';status.setAttribute('role','status');
 const notice=document.createElement('p');notice.id='notice';notice.textContent='🔒 카드번호·유효기간·카드 비밀번호·본인확인 정보를 읽거나 저장하지 않아. 최종 결제 버튼도 누르지 않아.';
 title.appendChild(close);panel.append(title,desc,select,go,status,notice);shadow.append(style,launch,panel);
 (document.body||document.documentElement).appendChild(host);
 launch.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)status.textContent=hint();});
 close.addEventListener('click',()=>{panel.hidden=true;});
 select.addEventListener('change',()=>{
  if(!choices.some(x=>x.id===select.value))return;
  chosen=select.value;save(chosen);lastActionStage='';lastActionMode='';
  status.textContent=hint();
 });

 // Inspect ONLY visible, static navigation labels and image alt text.
 // In particular: never read form input values or card-field contents.
 function visible(node){
  if(!node||!node.isConnected||host.contains(node))return false;
  for(let el=node;el&&el.nodeType===1;el=el.parentElement){
   if(el.hidden)return false;
   const cs=getComputedStyle(el);
   if(cs.display==='none'||cs.visibility==='hidden'||cs.visibility==='collapse')return false;
  }
  return node.getClientRects().length>0;
 }
 function labelOf(node){
  if(node.tagName==='IMG')return node.getAttribute('alt')||'';
  if(node.children.length===0)return node.textContent||'';
  // A semantic button may have a single styled label child.
  if(node.matches('button,a,[role="button"]')&&node.children.length<=1)
   return node.textContent||'';
  return '';
 }
 function staticNodes(){
  return Array.from(document.querySelectorAll('h1,h2,h3,h4,button,a,[role="button"],li,div,span,p,strong,small,img'))
   .filter(el=>visible(el)&&!el.closest('#bbpPayappMethodHelper'));
 }
 function stage(){
  const labels=new Set(staticNodes().map(labelOf).map(norm).filter(Boolean));
  if(labels.has(norm('결제방식 선택')))return 'method';
  if(labels.has(norm('결제카드 선택')))return 'card_method';
  if(labels.has(norm('카드번호'))&&labels.has(norm('유효기간')))return 'card_form';
  return 'other';
 }
 function hint(){
  const which=stage(), c=choices.find(x=>x.id===chosen);
  if(which==='method')return '결제방식 선택 화면 · '+c.name+' 경로를 선택할 수 있어.';
  if(which==='card_method')return c.sub?'카드결제 세부방식 선택 화면 · '+(chosen==='card'?'카드번호 직접입력':'ISP/안심클릭')+'을 선택해 줘.':'카드 세부방식 화면이야. 직접 확인해 줘.';
  if(which==='card_form')return '카드 입력 화면이야. Firefox 자체 자동완성 또는 직접 입력 후 최종 결제는 본인이 해 줘.';
  return '약관/인증/결제 단계일 수 있어. 공식 화면을 직접 확인해 줘.';
 }
 function findUnique(aliases){
  const targets=staticNodes().filter(n=>{
   const l=norm(labelOf(n));return !!l&&aliases.some(alias=>l===norm(alias));
  });
  // One DOM node only. Ambiguous navigation MUST fall back to manual selection.
  if(targets.length!==1)return null;
  const el=targets[0];
  const nearestButton=el.closest('button,[type="submit"]');
  if(nearestButton&&norm(nearestButton.textContent)==='결제')return null;
  return el;
 }
 go.addEventListener('click',()=>{
  const which=stage(),c=choices.find(x=>x.id===chosen)||choices[0];
  if(which==='card_form'){status.textContent='카드정보 입력·결제 승인은 자동으로 진행하지 않아.';return;}
  if(which!=='method'&&which!=='card_method'){status.textContent='안전하게 선택할 수 있는 결제방식 화면이 아니야. 직접 확인해 줘.';return;}
  if(which==='card_method'&&!c.sub){status.textContent='다른 방식이 이미 선택된 화면이야. 뒤로 돌아가서 직접 변경해 줘.';return;}
  if(lastActionStage===which&&lastActionMode===chosen){status.textContent='같은 화면에서 중복 클릭하지 않을게. 화면 전환을 확인해 줘.';return;}
  const aliases=which==='method'?c.route:c.sub;
  const dest=findUnique(aliases);
  if(!dest){status.textContent='이 화면에서 선택 버튼을 정확히 하나만 찾지 못했어. 공식 목록에서 직접 눌러줘.';return;}
  lastActionStage=which;lastActionMode=chosen;
  // Navigation-only; NEVER click the final "결제"/submit button.
  dest.click();
  status.textContent='선택 항목을 1회 눌렀어. 다음 화면을 확인해 줘. 결제 완료는 아니야.';
 });
})();
