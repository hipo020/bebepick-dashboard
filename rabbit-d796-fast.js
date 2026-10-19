(function(){
'use strict';
try{
 if(location.hostname!=='bebepick.me'||!/^\/live\/?$/.test(location.pathname)){alert('먼저 베베픽 주문 페이지 https://bebepick.me/live 에 들어가 줘.');return;}
 if(window.__bbpRabbitFast){window.__bbpRabbitFast.show();return;}
 var KEY='bbp_cart_v1',SKU='D796',active=false,completed=false,autoPay=false,payRequested=false,payArmed=false,payDone=false,timer=null;
 function mainLine(x){return x&&x.store!=='china';}
 function read(){var c=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(c))throw Error('장바구니 저장 형식이 다름');return c;}
 function preflight(){var c=read().filter(mainLine);return c.length===1&&c[0].sku===SKU&&c[0].opt!=='fullbox'&&Number(c[0].qty)===1;}
 function prepare(){
  try{
   var c=read(),extra=c.filter(function(x){return mainLine(x)&&x.sku!==SKU;});
   if(extra.length){alert('기존 베베픽 장바구니에 다른 상품이 있어. 기존 상품은 변경하지 않았어.');return false;}
   var same=c.filter(function(x){return mainLine(x)&&x.sku===SKU;});
   if(same.length){
    if(same.length!==1||same[0].opt==='fullbox'||Number(same[0].qty)!==1){alert('밤토끼가 다른 수량/옵션으로 담겨 있어. 먼저 장바구니를 확인해 줘.');return false;}
   }else{
    c.push({sku:SKU,qty:1,opt:'single',store:'main',lid:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
    localStorage.setItem(KEY,JSON.stringify(c));
    try{window.dispatchEvent(new StorageEvent('storage',{key:KEY}));}catch(_){}
   }
   if(!preflight())throw Error('장바구니 내용 검사 실패');
   return true;
  }catch(e){alert('장바구니 준비 실패: '+String(e.message||e));return false;}
 }
 function el(s){return document.querySelector(s);}
 function ready(){var p=el('[data-ctl="D796"]');p=p&&p.closest('.prod');return {card:!!p,product:!!p&&!p.classList.contains('soldout'),window:!!el('#storeBar .sb-order.open')};}
 var panel=document.createElement('section');panel.id='bbpRabbitFastHelper';
 panel.style.cssText='position:fixed;z-index:2147483645;left:12px;right:12px;bottom:12px;max-width:420px;margin:auto;background:#fff;color:#1f1f1f;border-radius:16px;padding:14px 16px;box-shadow:0 6px 28px #0006;font:14px/1.45 system-ui,sans-serif;border:2px solid #b79ade';
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong>🐰 밤토끼 D796 · 낱개 1개</strong><button type="button" id="rbClose" style="font-size:20px;background:none;border:0;color:#333">×</button></div><div style="color:#666;margin:6px 0">13,000원 · 배송비 등은 공식 화면에서 확인</div><div id="rbStatus" role="status" style="font-weight:700;margin-bottom:8px">대기 준비 중</div><label style="display:block;font-size:13px;margin:8px 0"><input type="checkbox" id="rbAutoPay"> 직접 주문 확정 후 페이앱 결제창 자동 열기 (선택)</label><div style="display:flex;gap:8px"><button type="button" id="rbStart" style="flex:1;border:0;border-radius:10px;background:#744eb4;color:white;padding:10px;font-weight:700">대기 시작</button><button type="button" id="rbStop" style="border:1px solid #ccc;border-radius:10px;background:#fff;padding:10px">중지</button></div><small style="display:block;color:#777;margin-top:8px">재고 확보·주문 자동 확정·결제는 하지 않아. 주문 및 재고 상태가 공식 화면에 갱신되어야 작동해. 새로고침 후 재실행 필요.</small>';
 document.body.appendChild(panel);
 function status(v){var t=panel.querySelector('#rbStatus');if(t&&t.textContent!==v)t.textContent=v;}
 function stop(){active=false;if(timer){clearInterval(timer);timer=null;}}
 function show(){panel.style.display='block';}
 window.__bbpRabbitFast={show:show,stop:stop};
 panel.querySelector('#rbClose').onclick=function(){stop();payArmed=false;panel.style.display='none';};
 panel.querySelector('#rbStop').onclick=function(){stop();payArmed=false;status('⏸ 대기 종료');};
 function watchPay(){
  if(!payArmed||payDone)return;
  var pay=el('.panel[data-sheet="pay"] [data-act="pay-card"]');
  if(!pay||pay.disabled||!pay.isConnected)return;
  if(/테스트|흉내/.test(pay.textContent||'')){payArmed=false;status('⚠ 결제 버튼을 직접 확인해 줘');return;}
  payDone=true;payArmed=false;status('✅ 주문 확인 완료 · 결제창 이동 시도');pay.click();
 }
 function tick(){
  if(payArmed){watchPay();return;}
  if(!active)return;
  if(document.hidden){status('📱 크롬 화면을 열어둬야 해');return;}
  if(!preflight()){stop();status('⚠ 장바구니 내용 변경됨 · 자동 진행 중지');return;}
  var r=ready();
  if(!r.card){status('⚠ 밤토끼 상품을 찾지 못함');return;}
  if(!r.window){status('⏳ 주문 접수 대기 중');return;}
  if(!r.product){status('⏳ 밤토끼 품절 · 공식 상품 정보 갱신 필요');return;}
  var b=el('#cartBar .cb-submit')||el('#btnTopCart:not([hidden])');
  if(!b||b.disabled){status('✅ 주문 가능 표시 · 주문 버튼 확인 필요');return;}
  stop();completed=true;payRequested=autoPay;payArmed=false;payDone=false;status('✅ 판매 표시 확인 · 공식 주문창 열기 시도');
  b.click();
  var tries=0,seq=setInterval(function(){
   var next=el('.panel[data-sheet="cart"] #checkout');
   if(next&&!next.disabled){clearInterval(seq);next.click();status('📋 배송·개봉 조건 확인 및 주문 확정은 직접 해 줘');return;}
   if(++tries>=16){clearInterval(seq);payRequested=false;status('⚠ 공식 주문 버튼이 비활성화되어 있어 · 직접 확인해 줘');}
  },220);
 }
 panel.querySelector('#rbStart').onclick=function(){
  if(completed){status('중복 실행 방지: 페이지 새로고침 후 다시 실행해 줘');return;}
  if(!prepare())return;
  autoPay=!!panel.querySelector('#rbAutoPay').checked;
  if(autoPay&&!confirm('동의와 주문 확정은 직접 진행하고, 그 후 페이앱 화면 열기만 자동으로 시도할까?'))return;
  active=true;status('✅ 낱개 1개 준비 · 판매 시작 대기 중');
  if(timer)clearInterval(timer);
  timer=setInterval(tick,900);tick();
 };
 document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-oc=ok]'):null;
  if(payRequested&&completed&&b&&e.isTrusted&&!b.disabled&&el('#ocAll')&&el('#ocAll').checked){payArmed=true;payRequested=false;status('✅ 수동 주문 확정 확인 · 결제창 열기 대기');}
 },true);
 var observer=new MutationObserver(function(){if(active)tick();if(payArmed)watchPay();});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled']});
 window.addEventListener('pagehide',function(){stop();payArmed=false;});
 status('✅ 도우미 실행 성공 · 대기 시작을 눌러 줘');
}catch(e){alert('밤토끼 도우미 오류: '+String(e.message||e));}
})();