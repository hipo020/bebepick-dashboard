(function(){
'use strict';
try{
 if(location.hostname!=='bebepick.me'||!/^\/live\/?$/.test(location.pathname)){alert('먼저 베베픽 주문 페이지 https://bebepick.me/live 에 들어가 줘.');return;}
 if(window.__bbpRabbitFast&&window.__bbpRabbitFast.__v3){window.__bbpRabbitFast.show();return;}if(window.__bbpRabbitFast){try{window.__bbpRabbitFast.stop();}catch(e){}var old=document.getElementById('bbpRabbitFastHelper');if(old)old.remove();}
 var KEY='bbp_cart_v1',SKU='D796',active=false,completed=false,autoPay=false,payRequested=false,payArmed=false,payDone=false,timer=null,pollTimer=null,pollAborts=new Set(),pollBusy=false,confirmed=false,errors=0,stateWindow=null,stateStock=null,lastWindowAt=0,lastStockAt=0;
 var PREF='bbp_rabbit_d796_v3',pref={};
 try{pref=JSON.parse(localStorage.getItem(PREF)||'{}')||{};}catch(e){}
 var allowed=[5,8,10,15,30,60],selectedOpt=pref.opt==='fullbox'?'fullbox':'single',intervalMs=allowed.includes(+pref.interval)?(+pref.interval)*1000:10000;
 function savePref(){try{localStorage.setItem(PREF,JSON.stringify({opt:selectedOpt,interval:intervalMs/1000}));}catch(e){}}
 function optTitle(){return selectedOpt==='fullbox'?'풀박스 6개입 1세트':'낱개 1개';}
 function mainLine(x){return x&&x.store!=='china';}
 function read(){var c=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(c))throw Error('장바구니 저장 형식이 다름');return c;}
 function preflight(){var c=read().filter(mainLine);return c.length===1&&c[0].sku===SKU&&(c[0].opt==='fullbox'?'fullbox':'single')===selectedOpt&&Number(c[0].qty)===1;}
 function prepare(){
  try{
   var c=read(),main=c.filter(mainLine),other=main.filter(function(x){return x.sku!==SKU;}),rabbit=main.filter(function(x){return x.sku===SKU;});
   if(other.length){alert('다른 베베픽 상품이 장바구니에 있어. 다른 상품은 그대로 두고 대기를 시작하지 않을게.');return false;}
   if(rabbit.length>1){alert('밤토끼가 여러 줄 있어. 장바구니에서 먼저 확인해 줘.');return false;}
   if(rabbit.length===1){
    var x=rabbit[0],opt=x.opt==='fullbox'?'fullbox':'single';
    if(opt===selectedOpt&&Number(x.qty)===1)return preflight();
    if(!confirm('밤토끼 기존 '+(opt==='fullbox'?'풀박스':'낱개')+' '+x.qty+'개를 '+optTitle()+'로 변경할까?'))return false;
    c=c.filter(function(x){return !(mainLine(x)&&x.sku===SKU);});
   }
   c.push({sku:SKU,qty:1,opt:selectedOpt,store:'main',lid:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
   localStorage.setItem(KEY,JSON.stringify(c));
   try{window.dispatchEvent(new StorageEvent('storage',{key:KEY}));}catch(e){}
   if(!preflight())throw Error('장바구니 저장 결과 확인 실패');
   return true;
  }catch(e){alert('장바구니 준비 오류: '+String(e.message||e));return false;}
 }
 function el(s){return document.querySelector(s);}
 function ready(){var p=el('[data-ctl="D796"]');p=p&&p.closest('.prod');return {card:!!p,product:!!p&&!p.classList.contains('soldout')&&(selectedOpt==='single'||!p.classList.contains('fbout')),window:!!el('#storeBar .sb-order.open')};}
 var panel=document.createElement('section');panel.id='bbpRabbitFastHelper';
 panel.style.cssText='position:fixed;z-index:2147483645;left:12px;right:12px;bottom:12px;max-width:420px;margin:auto;background:#fff;color:#1f1f1f;border-radius:16px;padding:14px 16px;box-shadow:0 6px 28px #0006;font:14px/1.45 system-ui,sans-serif;border:2px solid #b79ade';
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong>🐰 밤토끼 D796 · 주문 대기 v3</strong><button type="button" id="rbClose" style="font-size:20px;background:none;border:0;color:#333">×</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><label style="flex:1;min-width:135px;font-size:12px">구매 옵션<select id="rbOption" style="display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#222"><option value="single">낱개 1개</option><option value="fullbox">풀박스 1세트 (6개)</option></select></label><label style="flex:1;min-width:120px;font-size:12px">새고(서버 확인) 주기<select id="rbInterval" style="display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#222"><option value="5">5초 (빠름)</option><option value="8">8초</option><option value="10">10초 (기본)</option><option value="15">15초</option><option value="30">30초</option><option value="60">60초</option></select></label></div><div id="rbPrice" style="color:#666;margin:6px 0">배송비는 공식 화면에서 확인</div><div id="rbStatus" role="status" style="font-weight:700;margin-bottom:8px">대기 준비 중</div><label style="display:block;font-size:13px;margin:8px 0"><input type="checkbox" id="rbAutoPay"> 직접 주문 확정 후 페이앱 결제창 자동 열기 (선택)</label><div style="display:flex;gap:8px"><button type="button" id="rbStart" style="flex:1;border:0;border-radius:10px;background:#744eb4;color:white;padding:10px;font-weight:700">대기 시작</button><button type="button" id="rbStop" style="border:1px solid #ccc;border-radius:10px;background:#fff;padding:10px">중지</button></div><small style="display:block;color:#777;margin-top:8px">재고 확보·주문 자동 확정·결제는 하지 않아. 선택한 주기마다 주문 상태와 선택한 옵션 재고를 각각 조회해. 브라우저 새로고침은 하지 않아. 5초는 요청 제한 위험이 있어. 화면을 켜두고, 새로고침 후엔 북마크를 다시 실행해.</small>';
 document.body.appendChild(panel);
 var rbOption=panel.querySelector('#rbOption'),rbInterval=panel.querySelector('#rbInterval'),rbPrice=panel.querySelector('#rbPrice');
 function showPref(){rbOption.value=selectedOpt;rbInterval.value=String(intervalMs/1000);rbPrice.textContent=(selectedOpt==='fullbox'?'78,000원 (풀박스)':'13,000원 (낱개)')+' · 배송비는 공식 화면에서 확인';}
 showPref();
 function changePref(){stop();if(completed){status('주문 진행 뒤에는 설정 변경 불가. 새로고침 후 변경해 줘');showPref();return;}selectedOpt=rbOption.value==='fullbox'?'fullbox':'single';intervalMs=(allowed.includes(+rbInterval.value)?+rbInterval.value:10)*1000;savePref();stateWindow=null;stateStock=null;confirmed=false;status('⚙ 설정 저장 완료 · 대기 시작을 눌러 줘');showPref();}
 rbOption.onchange=changePref;rbInterval.onchange=changePref;
 var reload=document.createElement('button');reload.type='button';reload.textContent='🛒 서버 판매 감지 · 새로고침하고 주문하기';reload.hidden=true;reload.style.cssText='width:100%;margin-top:9px;border:0;border-radius:10px;padding:12px;background:#2e2441;color:white;font-weight:700';panel.appendChild(reload);
 reload.onclick=function(){if(!preflight()){alert('장바구니를 확인해 줘.');return;}location.assign('https://bebepick.me/live');};
 function status(v){var t=panel.querySelector('#rbStatus');if(t&&t.textContent!==v)t.textContent=v;}
 function stop(){active=false;if(timer){clearInterval(timer);timer=null;}if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}pollAborts.forEach(function(c){c.abort();});pollAborts.clear();}
 function show(){panel.style.display='block';}
 window.__bbpRabbitFast={show:show,stop:stop,__v3:true};
 panel.querySelector('#rbClose').onclick=function(){stop();payArmed=false;panel.style.display='none';};
 panel.querySelector('#rbStop').onclick=function(){stop();payArmed=false;status('⏸ 대기 종료');};
 function watchPay(){
  if(!payArmed||payDone)return;
  var pay=el('.panel[data-sheet="pay"] [data-act="pay-card"]');
  if(!pay||pay.disabled||!pay.isConnected)return;
  if(/테스트|흉내/.test(pay.textContent||'')){payArmed=false;status('⚠ 결제 버튼을 직접 확인해 줘');return;}
  payDone=true;payArmed=false;status('✅ 주문 확인 완료 · 결제창 이동 시도');pay.click();
 }
 // 서버 공식 읽기 전용 RPC. 공개 설정만 사용하며 주문·결제 요청, 토큰·쿠키 수집 없음.
 function schedule(ms){if(pollTimer)clearTimeout(pollTimer);if(active&&!confirmed)pollTimer=setTimeout(pollServer,ms);}
 async function rpcRead(fn,data){
  var cfg=window.APP_CONFIG||{};
  if(cfg.supabaseUrl!=='https://eqytdtxemjlygnobhiio.supabase.co'||!/^sb_publishable_/.test(String(cfg.supabaseAnonKey||'')))throw Error('공개 서버 설정 없음');
  var ctrl=new AbortController();pollAborts.add(ctrl);var timeout=setTimeout(function(){ctrl.abort();},7000);
  try{
   var r=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/'+fn,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',signal:ctrl.signal,headers:{'apikey':cfg.supabaseAnonKey,'content-type':'application/json','accept':'application/json'},body:JSON.stringify(data||{})});
   if(!r.ok){var error=new Error('HTTP '+r.status);error.status=r.status;throw error;}return await r.json();
  }finally{clearTimeout(timeout);pollAborts.delete(ctrl);}
 }
 function windowReady(w){return !!(w&&w.open===true&&w.enabled!==false&&w.closed!==true&&w.reason!=='paused');}
 function productReady(list){return Array.isArray(list)&&list.some(function(p){return p&&p.sku===SKU&&(p.stock===null||p.stock==='low')&&(!p.only||p.only==='main')&&(selectedOpt==='single'||(p.has_fullbox===true&&p.fullbox_out===false));});}
 function stateText(v,opened,closed){return v===null?'확인 실패':(v?opened:closed);}
 async function pollServer(){
  if(!active||confirmed||pollBusy)return;
  if(document.hidden){status('📱 크롬을 열면 주문·재고 확인 재개');schedule(intervalMs);return;}
  if(!preflight()){stop();status('⚠ 장바구니가 바뀌어서 감시 중지');return;}
  pollBusy=true;
  try{
   // 순서와 관계없이 매번 둘 다 묻고, 각 요청의 성공/실패를 독립적으로 기록한다.
   var results=await Promise.allSettled([
    rpcRead('order_windows',{}),
    rpcRead('list_products',{p_brand:'main'})
   ]);
   if(!active)return;
   var now=Date.now(),issues=[];
   if(results[0].status==='fulfilled'){
    var windows=results[0].value;
    if(windows&&windows.main&&typeof windows.main.open==='boolean'){
     stateWindow=windowReady(windows.main);lastWindowAt=now;
    }else{stateWindow=null;lastWindowAt=0;issues.push(new Error('주문 상태 응답 형식 오류'));}
   }else{stateWindow=null;lastWindowAt=0;issues.push(results[0].reason||new Error('주문 상태 조회 실패'));}
   if(results[1].status==='fulfilled'){
    var products=results[1].value;
    if(Array.isArray(products)){
     var found=products.find(function(p){return p&&p.sku===SKU;});
     if(found&&Object.prototype.hasOwnProperty.call(found,'stock')){
      stateStock=productReady(products);lastStockAt=now;
     }else{stateStock=null;lastStockAt=0;issues.push(new Error('밤토끼 상품 정보 없음'));}
    }else{stateStock=null;lastStockAt=0;issues.push(new Error('재고 조회 응답 형식 오류'));}
   }else{stateStock=null;lastStockAt=0;issues.push(results[1].reason||new Error('재고 조회 실패'));}
   var bothFresh=now-lastWindowAt<25000&&now-lastStockAt<25000;
   if(bothFresh&&stateWindow===true&&stateStock===true){
    confirmed=true;status('✅ 서버 확인: 주문 열림 + 밤토끼 판매 가능');tick();return;
   }
   var t=new Date(now).toLocaleTimeString('ko-KR',{hour12:false});
   var summary='📡 주문 '+stateText(stateWindow,'열림','닫힘')+' · '+(selectedOpt==='fullbox'?'풀박스':'낱개')+' '+stateText(stateStock,'판매 가능','품절')+' · '+t+' · '+intervalMs/1000+'초 간격';
   if(issues.length){
    errors++;
    if(issues.some(function(e){return e&&[401,403].includes(e.status); })){
     stop();status('⚠ 서버 조회 권한 없음 · 자동 감시 중단');return;
    }
    var limited=issues.some(function(e){return e&&e.status===429;});
    var delay=limited?60000:Math.min(120000,intervalMs*Math.pow(2,Math.min(errors,4)));
    status(summary+' · 조회 오류, '+Math.round(delay/1000)+'초 후 재확인');
    schedule(delay);
    return;
   }
   errors=0;status(summary);schedule(intervalMs);
  }catch(e){
   if(!active)return;
   errors++;
   var delay=Math.min(120000,intervalMs*Math.pow(2,Math.min(errors,4)));
   status('⚠ 상태 확인 처리 오류 · '+Math.round(delay/1000)+'초 후 재시도');schedule(delay);
  }finally{pollBusy=false;}
 }
 function tick(){
  if(payArmed){watchPay();return;}
  if(!active)return;
  if(!confirmed)return;
  if(document.hidden){status('📱 크롬 화면을 열어둬야 해');return;}
  if(!preflight()){stop();status('⚠ 장바구니 내용 변경됨 · 자동 진행 중지');return;}
  var r=ready();
  if(!r.card){status('⚠ 밤토끼 상품을 찾지 못함');return;}
  if(!r.window||!r.product){stop();completed=true;reload.hidden=false;status('🎉 서버 판매 가능 감지! 공식 화면은 이전 상태 · 아래 새로고침 버튼을 눌러 줘');return;}
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
  active=true;confirmed=false;errors=0;stateWindow=null;stateStock=null;lastWindowAt=0;lastStockAt=0;reload.hidden=true;status('✅ '+optTitle()+' 준비 · '+intervalMs/1000+'초 간격 감시 시작');
  if(timer)clearInterval(timer);
  timer=setInterval(tick,900);pollServer();
 };
 document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-oc=ok]'):null;
  if(payRequested&&completed&&b&&e.isTrusted&&!b.disabled&&el('#ocAll')&&el('#ocAll').checked){payArmed=true;payRequested=false;status('✅ 수동 주문 확정 확인 · 결제창 열기 대기');}
 },true);
 var observer=new MutationObserver(function(){if(active)tick();if(payArmed)watchPay();});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled']});
 document.addEventListener('visibilitychange',function(){if(active&&!document.hidden&&!pollBusy){if(pollTimer)clearTimeout(pollTimer);schedule(100);}});window.addEventListener('pagehide',function(){stop();payArmed=false;});
 status('✅ 도우미 실행 성공 · 대기 시작을 눌러 줘');
}catch(e){alert('밤토끼 도우미 오류: '+String(e.message||e));}
})();