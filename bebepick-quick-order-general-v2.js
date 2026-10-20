(function(){
'use strict';
try {
 const path=location.pathname, STORE=/^\/plus\/?$/.test(path)?'china':/^\/live\/?$/.test(path)?'main':null;
 if(location.hostname!=='bebepick.me'||!STORE){alert('베베픽 /live 또는 /plus 주문 페이지에서 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV2){window.__bbpGeneralQuickV2.show();return;}
 if(window.__bbpRabbitFast){try{window.__bbpRabbitFast.stop();}catch(e){}const old=document.getElementById('bbpRabbitFastHelper');if(old)old.remove();}
 const CART_KEY='bbp_cart_v1',OPTS_KEY='bbp_order_opts',PREF_KEY='bbp_quick_general_v2_'+STORE;
 const allowed=[5,8,10,15,30,60], labels={single:'낱개 1개',fullbox:'풀박스 1세트'};
 let oldPref={};try{oldPref=JSON.parse(localStorage.getItem('bbp_rabbit_d796_v3')||'{}')||{};}catch(e){}
 let pref={};try{pref=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){}
 let sku=String(pref.sku|| (STORE==='main'?'D796':'')),option=pref.option==='fullbox'?'fullbox':(oldPref.opt==='fullbox'?'fullbox':'single');
 let cycle=allowed.includes(+pref.cycle)?+pref.cycle:(allowed.includes(+oldPref.interval)?+oldPref.interval:10);
 let open=['개봉','미개봉','카드개봉'].includes(pref.open)?pref.open:'개봉';
 let storage=['보관','발송'].includes(pref.storage)?pref.storage:'보관';
 let autoPay=false,active=false,polling=false,confirmed=false,completed=false,waitingForPay=false,payDone=false,tries=0,timer=null,controllers=new Set(),catalog=[],lastResults=null;
 function el(q,root){return (root||document).querySelector(q);}
 function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({sku:sku,option:option,cycle:cycle,open:open,storage:storage}));}catch(e){}}
 function readCart(){let c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');if(!Array.isArray(c))throw Error('장바구니 저장 형식이 올바르지 않아');return c;}
 function belongs(c){return (c.store==='china'?'china':'main')===STORE;}
 function normalized(c){return c.opt==='fullbox'?'fullbox':'single';}
 function expected(){const c=readCart().filter(belongs);return c.length===1&&c[0].sku===sku&&normalized(c[0])===option&&Number(c[0].qty)===1;}
 function availableHere(p){return p&&(!p.only||p.only===STORE);}
 function target(){return catalog.find(p=>p&&p.sku===sku&&availableHere(p));}
 function allowedOption(p){return option==='single'||!!(p&&p.has_fullbox&&p.pack_size>1);}
 function saleable(p){if(!p||!availableHere(p)||!allowedOption(p))return false;
  if(!(p.stock===null||p.stock==='low'))return false;
  if(option==='fullbox'&&p.fullbox_out!==false)return false;
  if(p.per_person_max&&option==='fullbox'&&Number(p.pack_size)>Number(p.per_person_max))return false;
  return true;
 }
 function label(p){return p?String(p.name||p.sku)+' · '+p.sku:String(sku||'상품 미선택');}
 function money(n){return n!==null&&n!==undefined&&n!==''&&Number.isFinite(+n)?Number(n).toLocaleString('ko-KR')+'원':'가격 로그인 후 확인';}
 const panel=document.createElement('aside');panel.id='bbpQuickGeneralV2';
 panel.style.cssText='position:fixed;z-index:2147483645;left:10px;right:10px;bottom:10px;max-width:455px;max-height:86dvh;overflow:auto;margin:auto;background:#fff;border:2px solid #8762b8;border-radius:16px;padding:14px 14px 12px;color:#282235;box-shadow:0 8px 32px #0005;font:14px/1.48 system-ui,-apple-system,sans-serif';
 const inputStyle='width:100%;margin-top:3px;min-height:37px;border:1px solid #d8cee5;border-radius:9px;padding:7px;background:#fff;color:#202020;font:inherit';
 const rowStyle='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
 panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>🧸 베베픽 자동주문 · 범용 v2 시험판</strong><button id="qClose" type="button" style="border:0;background:#fff;font-size:23px;color:#333">×</button></div>'+
 '<div style="font-size:12px;color:#71677d;margin:3px 0" id="qChannel"></div>'+
 '<label style="font-weight:600;display:block;margin-top:9px">인형 이름·상품코드 검색<input id="qSearch" placeholder="예: 밤토끼, D796" autocomplete="off" style="'+inputStyle+'"></label>'+
 '<label style="font-weight:600;display:block;margin-top:7px">선택할 상품<select id="qSku" style="'+inputStyle+'"><option value="">상품 목록 불러오는 중…</option></select></label>'+
 '<div id="qProduct" style="font-size:12px;color:#6b5677;margin:7px 0"></div>'+
 '<div style="'+rowStyle+'"><label style="flex:1;min-width:123px">구매 단위<select id="qOpt" style="'+inputStyle+'"><option value="single">낱개 1개</option><option value="fullbox">풀박스 1세트</option></select></label><label style="flex:1;min-width:115px">서버 확인 주기<select id="qCycle" style="'+inputStyle+'"><option value="5">5초 (요청 많음)</option><option value="8">8초</option><option value="10">10초 (기본)</option><option value="15">15초</option><option value="30">30초</option><option value="60">60초</option></select></label></div>'+
 '<div style="'+rowStyle+'"><label style="flex:1;min-width:125px">개봉 옵션<select id="qOpen" style="'+inputStyle+'"><option value="개봉">개봉</option><option value="미개봉">미개봉</option><option value="카드개봉">카드개봉</option></select></label><label style="flex:1;min-width:120px">받는 방법<select id="qStorage" style="'+inputStyle+'"><option value="보관">보관</option><option value="발송">바로 배송</option></select></label></div>'+
 '<label style="font-size:12px;display:flex;gap:6px;align-items:start;margin:8px 0"><input type="checkbox" id="qPayAuto" style="margin-top:2px">내가 동의하고 주문 확정한 뒤 페이앱 결제창 열기만 자동 시도 (선택)</label>'+
 '<div id="qStatus" role="status" style="font-weight:700;padding:8px 9px;background:#f5effc;border-radius:8px;margin:9px 0">📦 상품 목록을 불러오는 중…</div>'+
 '<div style="display:flex;gap:7px;margin-top:8px"><button id="qStart" type="button" style="flex:1;border:0;border-radius:10px;padding:11px;background:#6b4aac;color:#fff;font-weight:700">대기 시작</button><button id="qStop" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">중지</button><button id="qLoad" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">목록 갱신</button></div>'+
 '<button id="qReload" type="button" hidden style="display:none;width:100%;margin-top:8px;border:0;border-radius:9px;background:#332340;color:#fff;padding:11px;font-weight:700">🛒 판매 가능 확인 · 공식 화면 새로고침</button>'+
 '<small style="display:block;color:#766d7f;margin-top:9px">판매 전 재고 확보는 안 돼. 두 서버 조건을 모두 확인하고 공식 주문 화면을 연 뒤 개봉·보관 내용을 검사해. 동의·주문 확정·결제 승인은 직접 진행해.</small>';
 document.body.appendChild(panel);
 const controls={search:el('#qSearch',panel),sku:el('#qSku',panel),opt:el('#qOpt',panel),cycle:el('#qCycle',panel),open:el('#qOpen',panel),storage:el('#qStorage',panel),pay:el('#qPayAuto',panel),status:el('#qStatus',panel),product:el('#qProduct',panel),reload:el('#qReload',panel)};
 el('#qChannel',panel).textContent='현재 주문몰: '+(STORE==='main'?'베베픽':'베베픽 플러스');
 function message(t){controls.status.textContent=t;}
 function show(){panel.style.display='block';}
 function stop(){active=false;if(timer)clearTimeout(timer);timer=null;controllers.forEach(c=>c.abort());controllers.clear();polling=false;}
 function config(){const c=window.APP_CONFIG||{};if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('공식 홈페이지 서버 설정 없음');const base=String(c.supabaseUrl).replace(/\/$/,'');if(base!=='https://eqytdtxemjlygnobhiio.supabase.co')throw Error('공식 서버가 예상한 주소와 다름');return {base:base,key:c.supabaseAnonKey};}
 async function rpc(fn,args){const c=config(),ctl=new AbortController();controllers.add(ctl);const to=setTimeout(()=>ctl.abort(),7500);
  try{const r=await fetch(c.base+'/rest/v1/rpc/'+fn,{method:'POST',credentials:'omit',cache:'no-store',mode:'cors',signal:ctl.signal,headers:{apikey:c.key,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(args||{})});
   if(!r.ok){const e=new Error('HTTP '+r.status+' '+fn);e.httpStatus=r.status;throw e;}return await r.json();
  }finally{clearTimeout(to);controllers.delete(ctl);}
 }
 function visibleProducts(){return catalog.filter(availableHere);}
 function fillCatalog(){const q=controls.search.value.toLocaleLowerCase('ko-KR').replace(/\s+/g,'');
  const list=visibleProducts().filter(p=>(String(p.name||'')+' '+p.sku).toLocaleLowerCase('ko-KR').replace(/\s+/g,'').includes(q)).slice(0,80);
  controls.sku.replaceChildren();
  if(!list.length){let z=document.createElement('option');z.value='';z.textContent='검색 결과 없음';controls.sku.append(z);}
  list.forEach(p=>{const o=document.createElement('option');o.value=p.sku;o.textContent=label(p);controls.sku.append(o);});
  if(list.some(p=>p.sku===sku))controls.sku.value=sku;else if(!q){const o=document.createElement('option');o.value='';o.textContent='상품을 선택해 줘';controls.sku.insertBefore(o,controls.sku.firstChild);controls.sku.value='';}
 }
 function updateInfo(){const p=target(),valid=!!p&&allowedOption(p);
  controls.opt.querySelector('[value="fullbox"]').disabled=!p||!p.has_fullbox||!p.pack_size||Number(p.pack_size)<=1;
  if(controls.opt.value==='fullbox'&&controls.opt.querySelector('[value="fullbox"]').disabled){option='single';controls.opt.value='single';}
  const price=p?(option==='fullbox'?p.fullbox_price:p.price):null;
  controls.product.textContent=p?(label(p)+' · '+(option==='fullbox'?'세트 '+p.pack_size+'개':labels.single)+' · '+money(price)+(p.stock==='out'?' · 품절':option==='fullbox'&&p.fullbox_out?' · 세트 품절':'')):'상품을 선택해 줘';
  return valid;
 }
 async function loadCatalog(silent){if(!silent)message('📦 공식 상품 목록 확인 중…');
  try{const p=await rpc('list_products',{p_brand:STORE});if(!Array.isArray(p))throw Error('상품 응답 형식이 예상과 다름');catalog=p;fillCatalog();updateInfo();
   if(!silent)message('✅ 현재 상품 목록 '+visibleProducts().length+'개 확인 · 설정 후 대기 시작');
   return true;
  }catch(e){message('⚠ 상품 목록을 불러오지 못했어: '+String(e.message||e));return false;}
 }
 function saveSettings(){if(active){stop();message('⚙ 설정이 바뀌어 대기를 멈췄어. 다시 시작을 눌러 줘.');}
  if(completed){message('주문 진행 후 설정 변경은 새로고침해 줘');return;}
  sku=controls.sku.value||sku;option=controls.opt.value==='fullbox'?'fullbox':'single';cycle=allowed.includes(+controls.cycle.value)?+controls.cycle.value:10;
  open=controls.open.value;storage=controls.storage.value;savePref();updateInfo();
 }
 async function prepare(){
  const p=target();if(!p||!availableHere(p)){message('⚠ 상품을 먼저 선택해 줘');return false;}
  if(!allowedOption(p)){message('⚠ 이 상품은 선택한 풀박스 옵션을 지원하지 않아');return false;}
  if(p.per_person_max&&option==='fullbox'&&Number(p.pack_size)>Number(p.per_person_max)){message('⚠ 선택한 세트가 1인 구매 제한을 초과해');return false;}
  let c;try{c=readCart();}catch(e){message('⚠ 장바구니 읽기 오류');return false;}
  const sameStore=c.filter(belongs);
  if(sameStore.length>1){message('⚠ 같은 몰에 다른 장바구니 항목이 여러 개 있어. 직접 확인해 줘');return false;}
  if(sameStore.length===1){
   const existing=sameStore[0];
   if(existing.sku!==sku||normalized(existing)!==option||Number(existing.qty)!==1){
    const yes=confirm('현재 장바구니 상품 '+existing.sku+' ('+(normalized(existing)==='fullbox'?'풀박스':'낱개')+' ×'+existing.qty+')을 '+label(p)+' '+labels[option]+'로 교체할까? 기존 상품이 변경돼.');
    if(!yes)return false;
    c=c.filter(x=>!belongs(x));
   }else{return prefill();}
  }
  c.push({sku:sku,opt:option,qty:1,store:STORE,lid:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
  try{localStorage.setItem(CART_KEY,JSON.stringify(c));window.dispatchEvent(new StorageEvent('storage',{key:CART_KEY}));}catch(e){message('⚠ 장바구니 저장 실패');return false;}
  if(!expected()){message('⚠ 저장된 장바구니 구성이 맞지 않아');return false;}
  return prefill();
 }
 function prefill(){try{let v={};try{v=JSON.parse(sessionStorage.getItem(OPTS_KEY)||'{}')||{};}catch(e){}
  v.open=open;v.storage=storage;sessionStorage.setItem(OPTS_KEY,JSON.stringify(v));return true;
 }catch(e){message('⚠ 개봉·보관 옵션을 미리 저장하지 못했어');return false;}}
 function serverOpen(w){return !!(w&&w.open===true&&w.enabled!==false&&w.closed!==true&&w.reason!=='paused');}
 function latestAvailability(p){return p? (saleable(p)?'판매 가능':option==='fullbox'?'세트 품절':'품절'):'확인 실패';}
 function schedule(delay){if(timer)clearTimeout(timer);if(active&&!confirmed)timer=setTimeout(poll,delay);}
 async function poll(){
  if(!active||polling||confirmed)return;
  if(document.hidden){message('📱 브라우저를 다시 열면 감시 재개');schedule(cycle*1000);return;}
  if(!expected()){stop();message('⚠ 장바구니 상품·옵션·수량이 바뀌어 감시 중지');return;}
  polling=true;
  try{const res=await Promise.allSettled([rpc('order_windows',{}),rpc('list_products',{p_brand:STORE})]);
   if(!active)return;
   let windowOk=null,productOk=null,failed=[],p=null;
   if(res[0].status==='fulfilled'){const w=res[0].value&&res[0].value[STORE];if(w&&typeof w.open==='boolean')windowOk=serverOpen(w);else failed.push(new Error('주문 응답 형식 오류'));}
   else failed.push(res[0].reason);
   if(res[1].status==='fulfilled'&&Array.isArray(res[1].value)){catalog=res[1].value;p=target();if(p&&Object.prototype.hasOwnProperty.call(p,'stock'))productOk=saleable(p);else failed.push(new Error('선택 상품을 찾지 못함'));}
   else failed.push(res[1].status==='rejected'?res[1].reason:new Error('재고 응답 형식 오류'));
   const when=new Date().toLocaleTimeString('ko-KR',{hour12:false});
   const nowStatus='📡 주문 '+(windowOk===null?'조회 실패':windowOk?'열림':'닫힘')+' · '+(p?p.name:sku)+' '+(productOk===null?'재고 조회 실패':latestAvailability(p))+' · '+when;
   if(failed.length){
    tries++;
    if(failed.some(e=>e&&[401,403].includes(e.httpStatus))){stop();message('⚠ 서버 조회 거절 · 감시 중지');return;}
    const delayed=failed.some(e=>e&&e.httpStatus===429)?60000:Math.min(120000,cycle*1000*Math.pow(2,Math.min(tries,4)));
    message(nowStatus+' · '+Math.round(delayed/1000)+'초 후 재확인');schedule(delayed);return;
   }
   tries=0;
   if(windowOk&&productOk){confirmed=true;message('✅ 공식 서버 주문·재고 모두 열림! 주문창 진입 시도');handoff();return;}
   message(nowStatus);schedule(cycle*1000);
  }catch(e){tries++;message('⚠ 감시 오류 · 잠시 뒤 다시 시도');schedule(Math.min(120000,cycle*2000*Math.pow(2,Math.min(tries,4))));}
  finally{polling=false;}
 }
 function reloadShow(){stop();completed=true;controls.reload.style.display='block';controls.reload.hidden=false;message('🎉 서버에서 판매 가능 확인! 공식 화면이 아직 갱신되지 않았어. 아래 버튼으로 새로고침하고 주문해 줘.');}
 function correctOrderControls(cartPanel){
  const chosenStore=el('[data-storage="'+storage+'"]',cartPanel),chosenOpen=el('[data-open="'+open+'"]',cartPanel);
  if(!chosenStore||!chosenOpen)return false;
  function chosen(button){return button.getAttribute('aria-checked')==='true';}
  if(!chosen(chosenStore))chosenStore.click();
  if(!chosen(chosenOpen))chosenOpen.click();
  return chosen(chosenStore)&&chosen(chosenOpen);
 }
 function handoff(){
  if(!expected()){stop();message('⚠ 장바구니 내용 변경 · 주문 진행 중지');return;}
  const pcard=el('[data-ctl="'+sku+'"]'),card=pcard&&pcard.closest('.prod');
  const w=el('#storeBar .sb-order.open'),shopFresh=card&&!card.classList.contains('soldout')&&(option==='single'||!card.classList.contains('fbout'));
  if(!w||!shopFresh){reloadShow();return;}
  const btn=el('#cartBar .cb-submit');
  if(!btn||btn.disabled){reloadShow();return;}
  stop();completed=true;message('✅ 공식 장바구니·주문창 여는 중…');
  btn.click();
  let n=0;
  const openCartTimer=setInterval(()=>{
   const cartPanel=el('.panel[data-sheet="cart"]');
   if(!cartPanel){if(++n>16){clearInterval(openCartTimer);message('⚠ 장바구니를 열지 못했어. 수동으로 확인해 줘.');}return;}
   if(!correctOrderControls(cartPanel)){clearInterval(openCartTimer);message('⚠ 주문 옵션 '+open+'·'+storage+'을 확인하지 못했어. 직접 설정해 줘.');return;}
   const next=el('#checkout',cartPanel);
   if(!next||next.disabled){if(++n>16){clearInterval(openCartTimer);message('⚠ 주문 버튼이 비활성화돼 있어. 직접 확인해 줘.');}return;}
   clearInterval(openCartTimer);waitingForPay=controls.pay.checked;message('📋 공식 확인창에서 '+open+' + '+storage+' 확인하고, 동의와 주문 확정은 직접 해 줘.');next.click();
  },250);
 }
 controls.reload.onclick=()=>{if(!expected()){message('⚠ 장바구니 내용을 확인해 줘');return;}location.assign(STORE==='main'?'https://bebepick.me/live':'https://bebepick.me/plus');};
 el('#qStart',panel).onclick=async()=>{
  if(completed){message('이미 주문 진행을 시도했어. 새로고침 후 다시 실행해 줘.');return;}
  if(active){message('⏳ 이미 감시 중이야');return;}
  if(!target()){const loaded=await loadCatalog(false);if(!loaded)return;}
  if(!controls.sku.value){message('⚠ 인형을 먼저 선택해 줘');return;}
  sku=controls.sku.value;savePref();
  if(!(await prepare()))return;
  autoPay=controls.pay.checked;
  if(autoPay&&!confirm('주문 내용·동의를 직접 확인하고 주문을 확정하면 페이앱 결제 화면 열기만 자동 시도할까?'))return;
  active=true;confirmed=false;tries=0;controls.reload.hidden=true;controls.reload.style.display='none';
  message('⏳ '+label(target())+' '+labels[option]+' · '+open+' + '+storage+' · '+cycle+'초 서버 감시 시작');
  poll();
 };
 el('#qStop',panel).onclick=()=>{stop();waitingForPay=false;message('⏸ 감시 중지');};
 el('#qLoad',panel).onclick=()=>{if(active){message('⏳ 감시 중에는 목록 갱신 불필요');return;}loadCatalog(false);};
 el('#qClose',panel).onclick=()=>{stop();waitingForPay=false;panel.style.display='none';};
 controls.search.addEventListener('input',()=>{if(active){stop();message('⚙ 검색으로 변경되어 감시 중지');}fillCatalog();});
 controls.sku.addEventListener('change',saveSettings);
 [controls.opt,controls.cycle,controls.open,controls.storage].forEach(e=>e.addEventListener('change',saveSettings));
 document.addEventListener('click',e=>{if(!waitingForPay||payDone||!e.isTrusted)return;
  const hit=e.target.closest&&e.target.closest('[data-oc="ok"]');
  if(hit&&!hit.disabled&&el('#ocAll')&&el('#ocAll').checked){
   const openShown=el('#ocOpen2'),storageShown=el('#ocStorage2');
   if(openShown&&storageShown&&openShown.textContent.trim()===open&&storageShown.textContent.trim()===(storage==='보관'?'보관':'바로 배송')){waitingForPay='armed';message('✅ 주문 확정 직접 선택됨 · 공식 페이앱 버튼 대기');}
   else{waitingForPay=false;message('⚠ 개봉·보관 선택 내용이 달라 결제 자동 열기 중지');}
  }
 },true);
 const ob=new MutationObserver(()=>{
  if(waitingForPay!=='armed'||payDone)return;
  const pay=el('.panel[data-sheet="pay"] [data-act="pay-card"]');
  if(pay&&!pay.disabled&&pay.isConnected){
   payDone=true;waitingForPay=false;message('✅ 직접 주문 확정 확인 · 페이앱 열기 시도');pay.click();
  }
 });
 ob.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden&&!polling&&!confirmed){if(timer)clearTimeout(timer);schedule(100);}});
 window.addEventListener('pagehide',()=>{stop();waitingForPay=false;ob.disconnect();});
 controls.opt.value=option;controls.cycle.value=String(cycle);controls.open.value=open;controls.storage.value=storage;
 window.__bbpGeneralQuickV2={show,stop};
 loadCatalog(false);
}catch(e){alert('범용 v2 오류: '+String(e.message||e));}
})();