// ==UserScript==
// @name         베베픽 · PAYAPP 결제수단 선택 도우미 (카드입력 기본)
// @namespace    https://hipo020.github.io/bebepick-dashboard/
// @version      0.4.0
// @description  명시적으로 설정한 경우 첫 화면 약관 동의→다음 및 결제수단 경로 자동 선택. 카드·인증·최종 결제 승인은 수동.
// @match        https://payapp.kr/WEBPAY_INPUT/*
// @match        https://www.payapp.kr/WEBPAY_INPUT/*
// @match        https://payapp.kr/WEBPAY_SCKA1/*
// @match        https://www.payapp.kr/WEBPAY_SCKA1/*
// @match        https://payapp.kr/homepage/*
// @match        https://www.payapp.kr/homepage/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-payapp-methods.user.js
// @updateURL    https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-payapp-methods.user.js
// ==/UserScript==

(function(){
 'use strict';
 const checkout=/^\/WEBPAY_(?:INPUT|SCKA1)\//.test(location.pathname);
 const presetPage=/^\/homepage\//.test(location.pathname);
 if(location.protocol!=='https:'||
    !['payapp.kr','www.payapp.kr'].includes(location.hostname)||
    (!checkout&&!presetPage)||window.top!==window.self)return;

 // No card information, passwords, identity data, PINs, CVC, page URLs or
 // payment metadata are read, cached, copied, logged or sent by this helper.
 // Persist only the harmless preferred payment METHOD in the user's browser.
 const PREF_KEY='bbp_payapp_method_v1';
 const AUTO_KEY='bbp_payapp_auto_route_v1';
 const AUTO_TERMS_KEY='bbp_payapp_auto_terms_v1';
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
 // PAYAPP uses BOTH payapp.kr and www.payapp.kr. These are different
 // localStorage origins. Tampermonkey's per-script GM storage bridges them.
 // Import an older preference only when there is no saved GM preference yet.
 const hasGM=typeof GM_getValue==='function'&&typeof GM_setValue==='function';
 const readSetting=key=>{
  if(hasGM){
   try{
    const existing=GM_getValue(key,null);
    if(existing!==null&&existing!==undefined)return String(existing);
   }catch{}
  }
  try{
   const legacy=localStorage.getItem(key);
   if(legacy!==null){
    if(hasGM){try{GM_setValue(key,legacy);}catch{}}
    return legacy;
   }
  }catch{}
  return null;
 };
 const writeSetting=(key,value)=>{
  if(hasGM)GM_setValue(key,value);
  try{localStorage.setItem(key,value);}catch{}
 };
 const stored=()=>{const id=readSetting(PREF_KEY);return choices.some(x=>x.id===id)?id:'card';};
 const save=id=>{try{writeSetting(PREF_KEY,id);}catch{/* keep checkout read-only */}};
 let chosen=stored(), lastActionStage='',lastActionMode='';
 // Explicit opt-in; the OFF state must override an older ON saved under
 // the other hostname. Only payment-method navigation is automated.
 const readAuto=()=>readSetting(AUTO_KEY)==='on';
 const saveAuto=on=>{
  try{writeSetting(AUTO_KEY,on?'on':'off');return readAuto()===on;}catch{return false;}
 };
 let autoNavigate=readAuto(),autoTimer=null;
 const readTermsAuto=()=>readSetting(AUTO_TERMS_KEY)==='on';
 const saveTermsAuto=on=>{try{writeSetting(AUTO_TERMS_KEY,on?'on':'off');return readTermsAuto()===on;}catch{return false;}};
 let autoTerms=readTermsAuto(),termsAutoTimer=null;
 // Home and checkout share the Tampermonkey preference even across the
 // apex/www hostname difference. Opening homepage creates no checkout.
 if(presetPage){
  const box=document.createElement('section');
  box.id='bbpPayappPresetPanel';
  box.style.cssText='position:fixed;left:10px;top:76px;z-index:2147483646;width:min(310px,calc(100vw - 20px));background:#fff;color:#352941;border:2px solid #cab4e7;border-radius:16px;padding:15px;box-shadow:0 6px 24px #0003;font:13px/1.55 system-ui,sans-serif';
  const title=document.createElement('h2');title.textContent='💳 베베픽 PAYAPP 사전 설정';title.style.cssText='margin:0 0 7px;font-size:16px';
  const intro=document.createElement('p');intro.textContent='주문이 닫혀 있어도 결제 경로를 미리 설정할 수 있어. 카드번호 직접입력이 기본값이야. 실제 PAYAPP 결제창은 www 주소를 사용해도 설정이 이어져.';
  const label=document.createElement('label');label.textContent='선호 결제수단';
  const method=document.createElement('select');method.id='bbpPresetMethod';
  method.style.cssText='display:block;width:100%;padding:10px;margin:6px 0;border:1px solid #ccb6dc;border-radius:9px;background:#fff;color:#333;font:inherit';
  for(const c of choices){
   const option=document.createElement('option');option.value=c.id;option.textContent=c.name;method.appendChild(option);
  }
  method.value=chosen;
  // Official PAYAPP CSS may hide native checkbox inputs globally.
  // Render an explicit, accessible ON/OFF button that remains visible on mobile.
  // The checkbox retains the actual unsaved preference for existing logic.
  const autoLabel=document.createElement('div');
  autoLabel.style.cssText='display:flex!important;flex-direction:column;gap:7px;margin-top:12px;padding:10px;border:1px solid #ddd2eb;border-radius:11px;background:#faf8ff';
  const auto=document.createElement('input');auto.type='checkbox';auto.id='bbpPresetAuto';auto.checked=autoNavigate;
  auto.style.cssText='position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important';
  const autoText=document.createElement('span');autoText.textContent='다음 결제부터 결제수단 경로 자동 선택';
  autoText.style.cssText='display:block;font-size:12px;font-weight:700';
  const autoSwitch=document.createElement('button');autoSwitch.type='button';
  autoSwitch.id='bbpPresetAutoSwitch';
  autoSwitch.setAttribute('aria-label','결제수단 경로 자동 선택 설정');
  const syncAutoSwitch=()=>{
   const on=!!auto.checked;
   autoSwitch.setAttribute('aria-pressed',String(on));
   autoSwitch.textContent=on?'✅ 자동 선택 ON':'○ 자동 선택 OFF · 눌러서 켜기';
   autoSwitch.style.cssText='display:block!important;width:100%!important;min-height:46px!important;padding:10px!important;border:2px solid '+(on?'#32875a':'#9c8dab')+'!important;border-radius:10px!important;background:'+(on?'#e9f7ee':'#fff')+'!important;color:'+(on?'#176237':'#51415d')+'!important;font:700 14px/1.4 system-ui,sans-serif!important;text-align:center!important;cursor:pointer!important;visibility:visible!important;opacity:1!important';
  };
  autoSwitch.addEventListener('click',()=>{
   auto.checked=!auto.checked;
   syncAutoSwitch();
   state.textContent='변경한 자동 선택 설정은 아래 [설정 저장]을 누르면 적용돼.';
  });
  auto.addEventListener('change',syncAutoSwitch);
  syncAutoSwitch();
  autoLabel.append(autoText,autoSwitch,auto);
  const termsGroup=document.createElement('div');
  termsGroup.style.cssText='padding:10px;border:1px solid #e3d5e8;border-radius:11px;margin:10px 0;background:#fff8f0';
  const termsTitle=document.createElement('strong');termsTitle.textContent='⚡ 전체동의 → 다음 자동 진행';
  termsTitle.style.cssText='display:block;font-size:12px;margin-bottom:6px';
  const termsText=document.createElement('p');
  termsText.textContent='설정을 켜면 매 결제의 약관 전체동의와 다음 버튼을 자동으로 눌러. 전자금융거래·개인정보 약관을 읽고 이 자동 처리에 동의하는 경우에만 켜줘. 약관 내용이 바뀌어도 자동화가 알아채지 못할 수 있어.';
  termsText.style.cssText='font-size:11px;line-height:1.5;color:#65495c';
  const termsSwitch=document.createElement('button');termsSwitch.type='button';termsSwitch.id='bbpPresetTermsAuto';
  termsSwitch.setAttribute('aria-label','약관 전체동의 및 다음 자동 진행 설정');
  let proposedTermsAuto=autoTerms;
  const syncTermsSwitch=()=>{
    termsSwitch.setAttribute('aria-pressed',String(proposedTermsAuto));
    termsSwitch.textContent=proposedTermsAuto?'✅ 약관 동의·다음 자동 ON':'○ 약관 동의·다음 자동 OFF';
    termsSwitch.style.cssText='display:block!important;width:100%!important;min-height:44px!important;padding:9px!important;border:2px solid '+(proposedTermsAuto?'#32875a':'#9b86aa')+'!important;border-radius:10px!important;background:'+(proposedTermsAuto?'#e7f5ed':'#fff')+'!important;color:#383047!important;font:750 13px system-ui!important;visibility:visible!important';
  };
  syncTermsSwitch();
  termsSwitch.addEventListener('click',()=>{
    proposedTermsAuto=!proposedTermsAuto;syncTermsSwitch();
    state.textContent='아래 [설정 저장]을 누르면 약관 자동 진행 설정이 적용돼.';
  });
  termsGroup.append(termsTitle,termsText,termsSwitch);
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.id='bbpPresetSave';saveButton.textContent='설정 저장';
  saveButton.style.cssText='display:block;width:100%;padding:11px;margin:11px 0 5px;border:0;border-radius:10px;background:#7553a9;color:#fff;font-weight:750';
  const state=document.createElement('p');state.id='bbpPresetStatus';state.setAttribute('role','status');
  state.textContent='선택한 결제수단과 자동 선택 ON/OFF만 저장해.';
  const detail=document.createElement('p');detail.textContent='카드번호·비밀번호·본인확인 정보는 저장하지 않아. 약관 자동 진행은 별도 ON일 때만 작동하고, 카드 입력·인증·결제 승인은 수동이야.';
  detail.style.cssText='font-size:11px;color:#71677d';
  box.append(title,intro,label,method,autoLabel,termsGroup,saveButton,state,detail);
  (document.body||document.documentElement).appendChild(box);
  saveButton.addEventListener('click',()=>{
   if(!choices.some(c=>c.id===method.value)){state.textContent='지원하지 않는 결제수단이야.';return;}
   try{
    writeSetting(PREF_KEY,method.value);
    if(!saveAuto(!!auto.checked)||!saveTermsAuto(proposedTermsAuto)||readSetting(PREF_KEY)!==method.value)
     throw Error('저장 확인 실패');
    chosen=method.value;autoNavigate=!!auto.checked;autoTerms=proposedTermsAuto;
    state.textContent='✅ 사전 설정 저장 완료 · 결제방식 자동 '+(autoNavigate?'ON':'OFF')+' · 약관 자동 '+(autoTerms?'ON':'OFF');
   }catch{
    state.textContent='⚠ 저장 실패. 같은 Firefox 일반 탭에서 열고 사이트 저장 권한을 확인해 줘.';
   }
  });
  return;
 }
 const host=document.createElement('div');
 host.id='bbpPayappMethodHelper';
 host.style.cssText='position:fixed;left:10px;top:68px;z-index:2147483646;font-family:system-ui,sans-serif;max-width:calc(100vw - 20px);';
 const shadow=host.attachShadow({mode:'open'});
 const style=document.createElement('style');
 style.textContent='*{box-sizing:border-box}button,select{font:inherit}button{border:0;cursor:pointer;border-radius:10px;padding:9px 11px}#launcher{background:#7453a5;color:#fff;font-size:12px;font-weight:750;box-shadow:0 3px 12px #0003}#termsNext{display:block;margin-top:7px;background:#eaf1ff;color:#1a3c98;border:2px solid #83a1f5;font-size:12px;font-weight:800;box-shadow:0 3px 12px #0002}#termsNext[hidden]{display:none}#termsNext:disabled{cursor:default;opacity:.75}#panel{width:min(310px,calc(100vw - 20px));background:#fff;color:#34263e;border:1px solid #decfed;border-radius:14px;padding:14px;box-shadow:0 8px 28px #0003;margin-top:7px;line-height:1.55}h2{font-size:15px;margin:0 0 9px}p{font-size:12px;margin:7px 0}select{width:100%;border:1px solid #d6c7eb;border-radius:10px;background:white;color:#34263e;padding:10px;font-size:14px}#go{width:100%;margin-top:9px;background:#7653aa;color:white;font-weight:700}#status{color:#6c547e}#notice{color:#a13a50}#close{float:right;background:#f3edfa;color:#604482;font-size:12px;padding:5px 9px}#panel[hidden]{display:none}';
 const launch=document.createElement('button');launch.type='button';launch.id='launcher';launch.textContent='💳 결제 방식';launch.title='PAYAPP 결제수단 선택 보조 도구 · 화면 왼쪽 위';
 // A prior explicit setting may authorize terms-navigation automation.
 // Keep a manual one-tap option for checkouts when that setting is OFF.
 const termsQuick=document.createElement('button');
 termsQuick.type='button';termsQuick.id='termsNext';
 termsQuick.textContent='☑ 약관 읽고 동의 → 다음';
 termsQuick.title='전자금융거래 약관과 개인정보 처리방침을 읽고 동의했다면 눌러 줘. 공식 전체동의/다음을 각각 최대 1회만 눌러.';
 termsQuick.setAttribute('aria-label','약관을 읽고 동의하며 다음으로 이동');
 termsQuick.hidden=!/^\/WEBPAY_INPUT\//.test(location.pathname);
 const panel=document.createElement('section');panel.id='panel';panel.hidden=true;panel.setAttribute('aria-label','결제수단 선택 보조 도구');
 const close=document.createElement('button');close.type='button';close.id='close';close.textContent='닫기';
 const title=document.createElement('h2');title.textContent='결제수단 선택 도우미';
 const desc=document.createElement('p');desc.textContent='약관 자동 ON이면 첫 화면의 전체동의와 다음을 자동 처리해. OFF라면 「약관 읽고 동의 → 다음」을 눌러. 결제수단 자동 선택은 별개야. 카드 입력·인증·최종 결제 승인은 직접 해.';
 const autoLabel=document.createElement('label');
 autoLabel.style.cssText='display:flex;gap:8px;align-items:center;background:#f4f0fb;padding:9px;border-radius:9px;font-size:12px;font-weight:650';
 const autoToggle=document.createElement('input');autoToggle.type='checkbox';autoToggle.checked=autoNavigate;
 const autoText=document.createElement('span');autoText.textContent='다음 결제부터 결제수단 경로 자동 선택 (결제 승인 아님)';
 autoLabel.append(autoToggle,autoText);
 const select=document.createElement('select');select.setAttribute('aria-label','선호 결제수단');
 for(const c of choices){const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.name;select.appendChild(opt);}
 select.value=chosen;
 const go=document.createElement('button');go.type='button';go.id='go';go.textContent='현재 화면에서 선택한 경로로 이동';
 const status=document.createElement('p');status.id='status';status.setAttribute('role','status');
 const notice=document.createElement('p');notice.id='notice';notice.textContent='🔒 카드번호·유효기간·카드 비밀번호·본인확인 정보를 읽거나 저장하지 않아. 최종 결제 버튼도 누르지 않아.';
 title.appendChild(close);panel.append(title,desc,autoLabel,select,go,status,notice);shadow.append(style,launch,termsQuick,panel);
 (document.body||document.documentElement).appendChild(host);
 launch.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)status.textContent=hint();});
 close.addEventListener('click',()=>{panel.hidden=true;});
 select.addEventListener('change',()=>{
  if(!choices.some(x=>x.id===select.value))return;
  chosen=select.value;save(chosen);lastActionStage='';lastActionMode='';
  status.textContent=hint();
  scheduleAuto();
 });
 autoToggle.addEventListener('change',()=>{
  autoNavigate=!!autoToggle.checked;
  if(!saveAuto(autoNavigate)){
   autoNavigate=readAuto();autoToggle.checked=autoNavigate;
   status.textContent='⚠ 설정 저장을 확인하지 못했어. Tampermonkey 권한을 확인해 줘.';
   return;
  }
  status.textContent=autoNavigate?'✅ 결제수단 자동 선택 ON · 약관은 별도 설정을 따라. 결제 승인은 직접 해.':'결제수단 자동 선택 OFF · 화면에서 직접 선택해 줘.';
  if(autoNavigate)scheduleAuto();
  else if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}
 });

 // Explicit per-order agreement helper (never runs on load or a saved
 // preference). It triggers only the real site's own agreement + Next controls.
 // Never bypass form validation, and never calls an endpoint directly.
 let termsNextUsed=false;
 const agreementLabel=el=>norm((el&&el.textContent)||'');
 function minimalUnique(nodes){
  const leaf=nodes.filter(n=>!nodes.some(other=>other!==n&&typeof n.contains==='function'&&n.contains(other)));
  return leaf.length===1?leaf[0]:null;
 }
 function exactAgree(){
  const all=Array.from(document.querySelectorAll('label,[role="checkbox"],button,div,span'));
  const matches=all.filter(n=>visible(n)&&agreementLabel(n)===norm('전체동의'));
  return minimalUnique(matches);
 }
 function exactNext(){
  const all=Array.from(document.querySelectorAll('button,a,[role="button"]'));
  const matches=all.filter(n=>visible(n)&&agreementLabel(n)===norm('다음'));
  return matches.length===1?matches[0]:null;
 }
 function termsFailure(reason){
  termsQuick.textContent='⚠ '+reason;
  status.textContent=reason+' · 공식 PAYAPP 화면에서 직접 진행해 줘.';
 }
 termsQuick.addEventListener('click',()=>{
  if(termsNextUsed||!/^\/WEBPAY_INPUT\//.test(location.pathname))return;
  const labels=staticNodes().map(n=>norm(labelOf(n))).filter(Boolean);
  if(!['전자금융거래','개인정보','전체동의'].every(word=>
      labels.some(label=>label.includes(norm(word))))){
   termsFailure('공식 약관 문구 확인 필요');return;
  }
  const agree=exactAgree(),next=exactNext();
  if(!agree||!next||next.disabled||next.getAttribute('aria-disabled')==='true'){
   termsFailure('전체동의/다음 버튼 확인 필요');return;
  }
  // One tap on this clearly labelled button is the user's consent for THIS
  // checkout only. If the official site is already fully agreed, do not
  // toggle it back off; otherwise click the site's actual agreement element.
  termsNextUsed=true;termsQuick.disabled=true;
  termsQuick.textContent='⏳ 공식 약관 동의 확인 중';
  const inputs=Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const alreadyAgreed=inputs.length>=2&&inputs.every(n=>n.checked===true);
  try{if(!alreadyAgreed)agree.click();}catch{termsFailure('전체동의 선택 실패');return;}
  setTimeout(()=>{
   if(!/^\/WEBPAY_INPUT\//.test(location.pathname))return;
   const button=exactNext();
   if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'){
    termsFailure('다음 버튼 활성 확인 필요');return;
   }
   // Let the official PAYAPP page validate its own agreed state. Never
   // retry a potentially submitted form, even if navigation is slow.
   try{button.click();termsQuick.textContent='✅ 다음 단계 이동 요청됨';}
   catch{termsFailure('다음 단계 이동 확인 필요');}
  },90);
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
  // Identify only the existence of fields; never inspect card numbers/values.
  if(/^\/WEBPAY_SCKA1\//.test(location.pathname)&&
     typeof document.getElementById==='function'&&document.getElementById('CardNo1'))
   return 'card_form';
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
  if(/^\/WEBPAY_INPUT\//.test(location.pathname))
   return '첫 단계는 전체동의 및 다음을 직접 눌러야 해. 이후 결제방식 화면에서 자동 선택을 시도해.';
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
 function navigateCurrentStep(isAutomatic){
  if(isAutomatic&&(!autoNavigate||document.hidden))return false;
  const which=stage(),c=choices.find(x=>x.id===chosen)||choices[0];
  if(which==='card_form'){if(!isAutomatic)status.textContent='카드정보 입력·결제 승인은 자동으로 진행하지 않아.';return false;}
  if(which!=='method'&&which!=='card_method'){
   if(!isAutomatic)status.textContent='안전하게 선택할 수 있는 결제방식 화면이 아니야. 직접 확인해 줘.';
   return false;
  }
  if(which==='card_method'&&!c.sub){
   if(!isAutomatic)status.textContent='다른 방식이 이미 선택된 화면이야. 뒤로 돌아가서 직접 변경해 줘.';
   return false;
  }
  // At most one selection per payment screen stage; never retry because a
  // network/payment pane is slow or the vendor ignores a synthetic click.
  if(lastActionStage===which&&lastActionMode===chosen){
   if(!isAutomatic)status.textContent='같은 화면에서 중복 클릭하지 않을게. 화면 전환을 확인해 줘.';
   return false;
  }
  const aliases=which==='method'?c.route:c.sub;
  const dest=findUnique(aliases);
  if(!dest){
   if(!isAutomatic)status.textContent='이 화면에서 선택 버튼을 정확히 하나만 찾지 못했어. 공식 목록에서 직접 눌러줘.';
   return false;
  }
  lastActionStage=which;lastActionMode=chosen;
  // ONLY vendor payment-method navigation. No terms, card fields, PIN or pay button.
  dest.click();
  status.textContent=(isAutomatic?'✅ 설정된 결제수단 자동 선택':'선택 항목을 1회 눌렀어')+' · 결제 완료는 아니야. 다음 화면에서 본인이 결제 정보를 확인해 줘.';
  return true;
 }
 go.addEventListener('click',()=>navigateCurrentStep(false));

 // A PAYAPP checkout can be an SPA. Once the user enables auto selection,
 // observe route-screen changes and select only the known safe payment tiles.
 // Do not open the helper panel, auto-agree to terms, or approve a payment.
 function scheduleAuto(){
  if(!autoNavigate||autoTimer!==null||document.hidden)return;
  autoTimer=setTimeout(()=>{autoTimer=null;navigateCurrentStep(true);},60);
 }
 if(typeof MutationObserver==='function'){
  const observer=new MutationObserver(scheduleAuto);
  observer.observe(document.body||document.documentElement,{
   childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']
  });
 }
 document.addEventListener('visibilitychange',scheduleAuto);
 window.addEventListener('pageshow',scheduleAuto);
 scheduleAuto();
})();
