(function(){
'use strict';
try{
 if(location.hostname!=='bebepick.me'||!/^\/live\/?$/.test(location.pathname)){alert('먼저 베베픽 주문 페이지 https://bebepick.me/live 에 들어가 줘.');return;}
 if(window.__bbpRabbitFast&&window.__bbpRabbitFast.__v4){window.__bbpRabbitFast.show();return;}if(window.__bbpRabbitFast){try{window.__bbpRabbitFast.stop();}catch(e){}var old=document.getElementById('bbpRabbitFastHelper');if(old)old.remove();}
 var KEY='bbp_cart_v1',SKU='D796',active=false,completed=false,autoPay=false,payRequested=false,payArmed=false,payDone=false,timer=null,pollTimer=null,pollAborts=new Set(),pollBusy=false,confirmed=false,errors=0,stateWindow=null,stateStock=null,lastWindowAt=0,lastStockAt=0,autoOrder=false,dryRun=true,wizardTimer=null,wizardStage=0,wizardStart=0,submitClicked=false,confirmedAt=0,routeBusy=false,lastRouteAt=0;
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
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong>🐰 밤토끼 D796 · 주문 자동화 v4</strong><button type="button" id="rbClose" style="font-size:20px;background:none;border:0;color:#333">×</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><label style="flex:1;min-width:135px;font-size:12px">구매 옵션<select id="rbOption" style="display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#222"><option value="single">낱개 1개</option><option value="fullbox">풀박스 1세트 (6개)</option></select></label><label style="flex:1;min-width:120px;font-size:12px">새고(서버 확인) 주기<select id="rbInterval" style="display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#222"><option value="5">5초 (빠름)</option><option value="8">8초</option><option value="10">10초 (기본)</option><option value="15">15초</option><option value="30">30초</option><option value="60">60초</option></select></label></div><div id="rbPrice" style="color:#666;margin:6px 0">배송비는 공식 화면에서 확인</div><div id="rbStatus" role="status" style="font-weight:700;margin-bottom:8px">대기 준비 중</div><div style="background:#f6f0ff;border-radius:10px;padding:9px;margin:8px 0"><label style="display:block;font-size:13px;font-weight:bold;margin:5px 0"><input type="checkbox" id="rbAutoOrder"> 개봉+보관 · 최종 주문까지 자동 클릭</label><label style="display:block;font-size:13px;margin:5px 0"><input type="checkbox" id="rbDryRun" checked> 무전송 시험 (실제 주문 생성 안 함 · 기본)</label><label style="display:block;font-size:13px;margin:5px 0"><input type="checkbox" id="rbAutoPay"> 주문 생성 뒤 페이앱 결제창 자동 열기 시도</label><small style="color:#63566a;font-size:11px">실제 자동 주문은 첫째 체크를 켜고 무전송 시험을 꺼야 해. 기존 주문 보관 전환 경고가 있으면 중지해.</small></div><div style="display:flex;gap:8px"><button type="button" id="rbStart" style="flex:1;border:0;border-radius:10px;background:#744eb4;color:white;padding:10px;font-weight:700">대기 시작</button><button type="button" id="rbStop" style="border:1px solid #ccc;border-radius:10px;background:#fff;padding:10px">중지</button></div><small style="display:block;color:#777;margin-top:8px">재고 확보·주문 자동 확정·결제는 하지 않아. 선택한 주기마다 주문 상태와 선택한 옵션 재고를 각각 조회해. 브라우저 새로고침은 하지 않아. 5초는 요청 제한 위험이 있어. 화면을 켜두고, 새로고침 후엔 북마크를 다시 실행해.</small>';
 document.body.appendChild(panel);
 var rbOption=panel.querySelector('#rbOption'),rbInterval=panel.querySelector('#rbInterval'),rbPrice=panel.querySelector('#rbPrice');
 function showPref(){rbOption.value=selectedOpt;rbInterval.value=String(intervalMs/1000);rbPrice.textContent=(selectedOpt==='fullbox'?'78,000원 (풀박스)':'13,000원 (낱개)')+' · 배송비는 공식 화면에서 확인';}
 showPref();
 function changePref(){stop();if(completed){status('주문 진행 뒤에는 설정 변경 불가. 새로고침 후 변경해 줘');showPref();return;}selectedOpt=rbOption.value==='fullbox'?'fullbox':'single';intervalMs=(allowed.includes(+rbInterval.value)?+rbInterval.value:10)*1000;savePref();stateWindow=null;stateStock=null;confirmed=false;status('⚙ 설정 저장 완료 · 대기 시작을 눌러 줘');showPref();}
 rbOption.onchange=changePref;rbInterval.onchange=changePref;
 var reload=document.createElement('button');reload.type='button';reload.textContent='🛒 서버 판매 감지 · 새로고침하고 주문하기';reload.hidden=true;reload.style.cssText='width:100%;margin-top:9px;border:0;border-radius:10px;padding:12px;background:#2e2441;color:white;font-weight:700';panel.appendChild(reload);
 reload.onclick=function(){if(!preflight()){alert('장바구니를 확인해 줘.');return;}location.assign('https://bebepick.me/live');};
 function status(v){var t=panel.querySelector('#rbStatus');if(t&&t.textContent!==v)t.textContent=v;}
 function stop(){active=false;if(wizardTimer){clearInterval(wizardTimer);wizardTimer=null;}if(timer){clearInterval(timer);timer=null;}if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}pollAborts.forEach(function(c){c.abort();});pollAborts.clear();}
 function show(){panel.style.display='block';}
 window.__bbpRabbitFast={show:show,stop:stop,__v4:true};
 panel.querySelector('#rbClose').onclick=function(){stop();payArmed=false;panel.style.display='none';};
 panel.querySelector('#rbStop').onclick=function(){var sent=submitClicked;stop();payArmed=false;status(sent?'⚠ 주문 요청은 이미 제출됐을 수 있어 · 주문 내역 확인 필요':'⏸ 감시·자동 진행 중지');};
 function watchPay(){
  if(!payArmed||payDone)return;
  var pay=el('.panel[data-sheet="pay"] [data-act="pay-card"]');
  if(!pay||pay.disabled||!pay.isConnected)return;
  if(/테스트|흉내|결제 끝내기/.test(pay.textContent||'')){payArmed=false;status('⚠ 결제 버튼을 직접 확인해 줘');return;}
  payDone=true;payArmed=false;status('✅ 주문 확인 완료 · 결제창 이동 시도');pay.click();
 }
 // 서버 공식 읽기 전용 RPC. 공개 설정만 사용하며 주문·결제 요청, 토큰·쿠키 수집 없음.
 function schedule(ms){if(pollTimer)clearTimeout(pollTimer);if(active&&!confirmed)pollTimer=setTimeout(pollServer,ms);}
 async function rpcRead(fn,data){
  var cfg=window.APP_CONFIG||{};
  if(cfg.supabaseUrl!=='https://eqytdtxemjlygnobhiio.supabase.co'||!/^sb_publishable_/.test(String(cfg.supabaseAnonKey||'')))throw Error('공개 서버 설정 없음');
  var ctrl=new AbortController();pollAborts.add(ctrl);var timeout=setTimeout(function(){ctrl.abort();},7000);
  try{
   var headers={'apikey':cfg.supabaseAnonKey,'content-type':'application/json','accept':'application/json'};
   // 베베픽 본래 로그인 저장소에서 현재 유효한 세션을 이 서버 요청에만 사용한다. 외부 전송·로그 기록 없음.
   try{
    var auth=JSON.parse(localStorage.getItem('sb-eqytdtxemjlygnobhiio-auth-token')||'null');
    if(auth&&typeof auth.access_token==='string'&&auth.expires_at>Math.floor(Date.now()/1000)+10)headers.authorization='Bearer '+auth.access_token;
   }catch(e){}
   var r=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/'+fn,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',signal:ctrl.signal,headers:headers,body:JSON.stringify(data||{})});
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
    confirmed=true;confirmedAt=Date.now();status('✅ 서버 확인: 주문 열림 + 밤토끼 판매 가능');tick();return;
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
  if(!r.window||!r.product){
   reload.hidden=false;status('🔄 서버 구매 가능 · 공식 상품 화면 갱신 시도');
   if(!routeBusy&&Date.now()-lastRouteAt>5500)refreshRoute();
   return;
  }
  var b=el('#cartBar .cb-submit')||el('#btnTopCart:not([hidden])');
  if(!b||b.disabled){status('✅ 주문 가능 표시 · 주문 버튼 확인 필요');return;}
  if(Date.now()-confirmedAt>Math.max(10000,intervalMs*2)){confirmed=false;status('🔄 주문 직전 서버 최신 상태 확인');pollServer();return;}
  stop();completed=true;payRequested=!autoOrder&&autoPay;payArmed=false;payDone=false;
  status('✅ 공식 상품 상태 확인 · 장바구니 열기');
  b.click();
  var tries=0,seq=setInterval(function(){
   var next=el('.panel[data-sheet="cart"] #checkout');
   if(next&&!next.disabled){
    clearInterval(seq);
    if(!preflight()){status('⚠ 장바구니 상품·옵션 불일치 · 자동 중지');return;}
    if(autoOrder){
     if(!saveOrderOpts()){status('⚠ 개봉·보관 설정 저장 실패');return;}
     wizardStage=0;wizardStart=Date.now();submitClicked=false;
     wizardTimer=setInterval(watchWizard,80);
    }
    next.click();
    status(autoOrder?'📋 공식 주문 확인창 2단계 자동 처리 대기':'📋 공식 주문 확인창 · 배송·개봉과 최종 확정 직접 진행');
    return;
   }
   if(++tries>=24){clearInterval(seq);status('⚠ 공식 주문 버튼이 비활성 · 직접 확인');}
  },150);
 }
 function saveOrderOpts(){
  try{
   var o=JSON.parse(sessionStorage.getItem('bbp_order_opts')||'{}')||{};
   o.storage='보관';o.open='개봉';
   o.use_credit=0;o.use_prize=0;o.use_free_ship=false;o.use_priority=false;
   sessionStorage.setItem('bbp_order_opts',JSON.stringify(o));
   var q=JSON.parse(sessionStorage.getItem('bbp_order_opts')||'{}');
   return q.storage==='보관'&&q.open==='개봉';
  }catch(e){return false;}
 }
 function abortWizard(msg){
  if(wizardTimer){clearInterval(wizardTimer);wizardTimer=null;}
  payArmed=false;payRequested=false;status('⛔ 자동 주문 중지 · '+msg);
 }
 function watchWizard(){
  if(!autoOrder||submitClicked)return;
  if(Date.now()-wizardStart>22000){abortWizard('확인창이 열리지 않음 · 수동 확인');return;}
  if(!preflight()){abortWizard('장바구니 변경됨');return;}
  var box=el('.oc[role="alertdialog"] .oc-box');
  if(!box)return;
  if(box.querySelector('#ocConv')||box.querySelector('#ocConv2')||box.querySelector('[data-oc-agree="convert"]')){abortWizard('다른 주문의 수령 방법이 변경될 수 있음 · 직접 확인');return;}
  var storage=box.querySelector('#ocStorage'),opening=box.querySelector('#ocOpen'),next=box.querySelector('[data-oc="next"]');
  if(storage&&opening&&next){
   if(wizardStage!==0)return;
   if(storage.textContent.trim()!=='보관'||opening.textContent.trim()!=='개봉'){abortWizard('개봉·보관 값 불일치');return;}
   var cs=Array.from(box.querySelectorAll('[data-oc-agree]'));
   if(cs.length!==2||cs.some(function(c){return !['storage','open'].includes(c.getAttribute('data-oc-agree'));})){abortWizard('새 동의 항목이 생겨 수동 확인 필요');return;}
   cs.forEach(function(c){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});
   if(next.disabled){abortWizard('다음 버튼 비활성');return;}
   wizardStage=1;next.click();status('📋 개봉·보관 검증 완료 · 2차 확인 중');return;
  }
  var st=box.querySelector('#ocStorage2'),op=box.querySelector('#ocOpen2'),ok=box.querySelector('[data-oc="ok"]');
  if(st&&op&&ok){
   if(st.textContent.trim()!=='보관'||op.textContent.trim()!=='개봉'){abortWizard('최종 선택값 다름');return;}
   if(dryRun){abortWizard('무전송 시험 성공 · 최종 주문 버튼은 누르지 않음');return;}
   if(wizardStage!==1)return;
   var all=box.querySelector('#ocAll');
   if(!all){abortWizard('최종 동의 항목을 찾지 못함');return;}
   wizardStage=2;all.checked=true;all.dispatchEvent(new Event('change',{bubbles:true}));
   status('📋 최종 동의 확인 · 공식 주문 버튼 자동 1회 누름 대기');
   setTimeout(function(){
    if(!wizardTimer||submitClicked||!box.isConnected||!preflight())return;
    var button=box.querySelector('[data-oc="ok"]');
    if(!button||button.disabled||!box.querySelector('#ocAll').checked){abortWizard('최종 버튼 비활성');return;}
    submitClicked=true;
    try{sessionStorage.setItem('bbp_rabbit_v4_last_submit',JSON.stringify({at:Date.now(),sku:SKU,opt:selectedOpt}));}catch(e){}
    clearInterval(wizardTimer);wizardTimer=null;
    payArmed=autoPay;payDone=false;
    status('📨 공식 주문 버튼 클릭 1회 · 서버 생성 결과 확인 중');
    button.click();if(payArmed)setTimeout(watchPay,350);
   },900);
  }
 }
 function refreshRoute(){
  if(routeBusy||!active||document.hidden)return;
  if(location.hash&&location.hash!=='#'){stop();status('⚠ 다른 페이지 이동 감지 · 공식 갱신 중단');return;}
  routeBusy=true;lastRouteAt=Date.now();
  history.replaceState(history.state,'',location.pathname+location.search+'#terms');window.dispatchEvent(new Event('hashchange'));
  setTimeout(function(){
   if(!active){routeBusy=false;return;}
   history.replaceState(history.state,'',location.pathname+location.search);window.dispatchEvent(new Event('hashchange'));
   setTimeout(function(){routeBusy=false;if(active)tick();},1200);
  },250);
 }

 panel.querySelector('#rbStart').onclick=function(){
  if(completed){status('중복 실행 방지: 페이지 새로고침 후 다시 실행해 줘');return;}
  if(!prepare())return;
  autoPay=!!panel.querySelector('#rbAutoPay').checked;
  autoOrder=!!panel.querySelector('#rbAutoOrder').checked;dryRun=!!panel.querySelector('#rbDryRun').checked;
  if(autoOrder){
   if(!saveOrderOpts()){status('⚠ 개봉·보관 사전 설정 실패');return;}
   if(!dryRun){
    var prev=null;try{prev=JSON.parse(sessionStorage.getItem('bbp_rabbit_v4_last_submit')||'null');}catch(e){}
    if(prev&&Date.now()-prev.at<180000){status('⚠ 최근 주문 제출 이력이 있어 · 주문 내역을 확인해 줘');return;}
    if(!confirm('⚠ 실제 자동 주문 동의\n\n밤토끼 '+optTitle()+' · 보관 · 개봉으로 실제 주문을 생성할 수 있어.\n공식 확인창 동의 2단계를 거쳐 최종 주문 버튼을 1회 자동으로 누르고 '+(autoPay?'페이앱 결제창도 자동으로 여는 걸 시도해.':'결제는 직접 진행해야 해.')+'\n\n결제 시 배송비가 추가될 수 있고 기존 미발송 주문이 보관으로 바뀔 수 있어. 결제 후 취소·옵션 변경이 제한돼. 별도 기존 주문 변경 경고가 나오면 멈출게.\n\n실제 주문 자동 제출을 허용할까?'))return;
   }
  }else if(autoPay&&!confirm('주문 확정은 직접 하고, 그 후 페이앱 화면 열기만 자동으로 시도할까?'))return;
  active=true;confirmed=false;errors=0;stateWindow=null;stateStock=null;lastWindowAt=0;lastStockAt=0;reload.hidden=true;status('✅ '+optTitle()+' · '+intervalMs/1000+'초 감시 · '+(autoOrder?(dryRun?'무전송 시험':'실제 주문 자동'):'직접 확정')+' 모드');
  if(timer)clearInterval(timer);
  timer=setInterval(tick,900);pollServer();
 };
 document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-oc=ok]'):null;
  if(payRequested&&completed&&b&&e.isTrusted&&!b.disabled&&el('#ocAll')&&el('#ocAll').checked){payArmed=true;payRequested=false;status('✅ 수동 주문 확정 확인 · 결제창 열기 대기');}
 },true);
 var observer=new MutationObserver(function(){if(active)tick();if(payArmed)watchPay();});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled']});
 document.addEventListener('visibilitychange',function(){if(active&&!document.hidden&&!pollBusy){if(pollTimer)clearTimeout(pollTimer);schedule(100);}});window.addEventListener('pagehide',function(){stop();payArmed=false;if(wizardTimer)clearInterval(wizardTimer);wizardTimer=null;});
 status('✅ v4 준비 완료 · 무전송 시험부터 확인해 줘');
}catch(e){alert('밤토끼 도우미 오류: '+String(e.message||e));}
})();