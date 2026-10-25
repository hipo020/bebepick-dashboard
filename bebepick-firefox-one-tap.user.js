// ==UserScript==
// @name         베베픽 v2.4 · Firefox 원터치 실행
// @namespace    https://hipo020.github.io/bebepick-dashboard/
// @version      1.0.0
// @description  베베픽 공식 주문 화면에 도우미 열기 버튼만 표시합니다. 자동주문/결제 시작 없음.
// @author       Bebepick dashboard
// @match        https://bebepick.me/live
// @match        https://bebepick.me/live/
// @match        https://bebepick.me/plus
// @match        https://bebepick.me/plus/
// @run-at       document-idle
// @noframes
// @grant        none
// @downloadURL  https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-one-tap.user.js
// @updateURL    https://hipo020.github.io/bebepick-dashboard/bebepick-firefox-one-tap.user.js
// ==/UserScript==

(function(){
 'use strict';
 const VALID_HOST='bebepick.me';
 const VALID_PATHS=new Set(['/live','/live/','/plus','/plus/']);
 const SOURCE='https://hipo020.github.io/bebepick-dashboard/bebepick-quick-order-general-v24.js?v=20261025-v24-conditional-700-900-v16';
 const BUTTON_ID='bbpFirefoxOneTapLauncher';
 const SCRIPT_ID='bbpFirefoxOneTapHelperSource';

 if(location.protocol!=='https:'||location.hostname!==VALID_HOST||!VALID_PATHS.has(location.pathname)||window.top!==window.self)return;
 if(document.getElementById(BUTTON_ID))return;

 const button=document.createElement('button');
 button.id=BUTTON_ID;
 button.type='button';
 button.textContent='🧸 주문 도우미';
 button.setAttribute('aria-label','베베픽 v2.4 주문 도우미 열기');
 button.title='탭하면 기존 v2.4 창을 열어. 실제 주문 시작은 별도 동의가 필요해.';
 button.style.cssText='position:fixed;top:34%;right:8px;z-index:2147483640;max-width:132px;min-height:41px;padding:8px 11px;border:1px solid #e7c8ff;border-radius:14px;background:#7752ad;color:#fff;box-shadow:0 4px 15px #24113f55;font:700 12px/1.4 system-ui,-apple-system,sans-serif;touch-action:manipulation;cursor:pointer;';

 // No order, payment or card fields are accessed by this launcher.
 // The remote helper is loaded ONLY after the user's direct tap.
 button.addEventListener('click',()=>{
  if(location.protocol!=='https:'||location.hostname!==VALID_HOST||!VALID_PATHS.has(location.pathname))return;
  if(typeof window.__bbpGeneralQuickV24?.show==='function'){
   window.__bbpGeneralQuickV24.show();
   return;
  }
  if(button.disabled)return;
  if(document.getElementById(SCRIPT_ID))return;
  button.disabled=true;
  button.textContent='불러오는 중…';
  const script=document.createElement('script');
  script.id=SCRIPT_ID;
  script.src=SOURCE;
  script.async=true;
  script.addEventListener('load',()=>{
   button.disabled=false;
   button.textContent='🧸 주문 도우미';
   // The helper normally opens itself on first load. No auto-start call.
   if(typeof window.__bbpGeneralQuickV24?.show!=='function'){
    script.remove();
    button.textContent='⚠ 다시 눌러줘';
    button.title='도우미 실행을 확인하지 못했어. 페이지를 새로고침하고 다시 시도해 줘.';
   }
  },{once:true});
  script.addEventListener('error',()=>{
   script.remove();
   button.disabled=false;
   button.textContent='⚠ 다시 눌러줘';
   button.title='스크립트를 불러오지 못했어. 브라우저 연결을 확인해 줘.';
  },{once:true});
  (document.head||document.documentElement).appendChild(script);
 });
 (document.body||document.documentElement).appendChild(button);
})();
