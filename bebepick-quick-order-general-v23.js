(function(){
'use strict';
try {
 const path=location.pathname, STORE=/^\/plus\/?$/.test(path)?'china':/^\/live\/?$/.test(path)?'main':null;
 if(location.hostname!=='bebepick.me'||!STORE){alert('베베픽 /live 또는 /plus 주문 페이지에서 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV2||window.__bbpGeneralQuickV23){alert('이미 자동주문 도우미가 실행 중이야. 충돌을 막기 위해 새로고침한 후 v2.3 북마크를 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV1||window.__bbpRabbitFast){alert('⚠ 이전 도우미가 열려 있어. 서로 다른 자동화가 충돌하지 않도록 베베픽 페이지를 한 번 새로고침하고 범용 v2 북마크를 실행해 줘.');return;}
 const CART_KEY='bbp_cart_v1',OPTS_KEY='bbp_order_opts',PREF_KEY='bbp_quick_general_v2_'+STORE;
 const allowed=[5,8,10,15,30,60], labels={single:'낱개 1개',fullbox:'풀박스 1세트'};
 let oldPref={};try{oldPref=JSON.parse(localStorage.getItem('bbp_rabbit_d796_v3')||'{}')||{};}catch(e){}
 let oldGeneral={};try{oldGeneral=JSON.parse(localStorage.getItem('bbp_quick_general_v1_'+STORE)||'{}')||{};}catch(e){}
 let pref={};try{pref=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){}
 pref={...oldGeneral,...pref};
 let sku=String(pref.sku||''),option=pref.option==='fullbox'?'fullbox':(oldPref.opt==='fullbox'?'fullbox':'single');
 let cycle=allowed.includes(+pref.cycle)?+pref.cycle:(allowed.includes(+oldPref.interval)?+oldPref.interval:8);
 let open=['개봉','미개봉','카드개봉'].includes(pref.open)?pref.open:'개봉';
 let storage=['보관','발송'].includes(pref.storage)?pref.storage:'보관';
 let cartProgress=null,cartPrepared=false,awaitingCatalog=false,autoPay=false,autoOrder=false,dryRun=true,active=false,polling=false,confirmed=false,completed=false,payArmed=false,payDone=false,tries=0,timer=null,controllers=new Set(),catalog=[],lastResults=null,triggerMode='',confirmedAt=0,routeBusy=false,lastRouteAt=0,cartTimer=null,wizardTimer=null,wizardStage=0,wizardStart=0,finalAgreeAt=0,submitClicked=false,payDeadline=0,oldPayOrder='';

 const WATCH_KEY='bbp_general_v23_watches_'+STORE,MAX_WATCH=10;
 let watchItems=[],armedItems=[],cartReplaceConsent=false;
 try{const a=JSON.parse(localStorage.getItem(WATCH_KEY)||'[]');
  if(Array.isArray(a))for(const v of a){
   const code=String(v?.sku||'').trim().toUpperCase(),opt=v?.option==='fullbox'?'fullbox':'single';
   if(/^[A-Z0-9-]{2,24}$/.test(code)&&!watchItems.some(w=>w.sku===code&&w.option===opt)&&watchItems.length<MAX_WATCH)
    watchItems.push({sku:code,option:opt,qty:1});
  }
 }catch(e){}
 if(!watchItems.length&&/^[A-Z0-9-]{2,24}$/.test(sku))watchItems=[{sku,option,qty:1}];
 function saveWatchList(){try{localStorage.setItem(WATCH_KEY,JSON.stringify(watchItems));}catch(e){}}
 function el(q,root){return (root||document).querySelector(q);}
 function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({sku:sku,option:option,cycle:cycle,open:open,storage:storage}));}catch(e){}}
 function readCart(){let c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');if(!Array.isArray(c))throw Error('장바구니 저장 형식이 올바르지 않아');return c;}
 function belongs(c){return (c.store==='china'?'china':'main')===STORE;}
 function normalized(c){return c.opt==='fullbox'?'fullbox':'single';}
 function cartMatches(a,b){
  if(a.length!==b.length)return false;
  const sig=x=>x.map(c=>c.sku+'|'+(c.option||normalized(c))+'|'+Number(c.qty)).sort().join(',');
  return sig(a)===sig(b);
 }
 function expected(){try{return armedItems.length>0&&cartMatches(readCart().filter(belongs),armedItems);}catch(e){return false;}}
 function availableHere(p){return p&&(!p.only||p.only===STORE);}
 function target(){return catalog.find(p=>p&&p.sku===sku&&availableHere(p));}
 function allowedOption(p,selectedOption=option){return selectedOption==='single'||!!(p&&p.has_fullbox&&p.pack_size>1);}
 function saleableFor(p,unit){
  if(!p||!availableHere(p)||!allowedOption(p,unit))return false;
  if(!(p.stock===null||p.stock==='low'))return false;
  if(unit==='fullbox'&&p.fullbox_out!==false)return false;
  if(p.per_person_max&&unit==='fullbox'&&Number(p.pack_size)>Number(p.per_person_max))return false;
  return true;
 }
 function saleable(p){return saleableFor(p,option);}
 function productFor(row){return catalog.find(p=>p&&p.sku===row.sku&&availableHere(p));}
 function eligibleNow(){return watchItems.filter(row=>saleableFor(productFor(row),row.option));}
 function label(p){return p?String(p.name||p.sku)+' · '+p.sku:String(sku||'상품 미선택');}
 function money(n){return n!==null&&n!==undefined&&n!==''&&Number.isFinite(+n)?Number(n).toLocaleString('ko-KR')+'원':'가격 로그인 후 확인';}
 const panel=document.createElement('aside');panel.id='bbpQuickGeneralV2';
 panel.style.cssText='position:fixed;z-index:2147483645;left:10px;right:10px;bottom:10px;max-width:455px;max-height:86dvh;overflow:auto;margin:auto;background:#fff;border:2px solid #8762b8;border-radius:16px;padding:14px 14px 12px;color:#282235;box-shadow:0 8px 32px #0005;font:14px/1.48 system-ui,-apple-system,sans-serif';
 const inputStyle='width:100%;margin-top:3px;min-height:37px;border:1px solid #d8cee5;border-radius:9px;padding:7px;background:#fff;color:#202020;font:inherit';
 const rowStyle='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
 panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>🧸 베베픽 자동주문 · 범용 v2.3 · 여러 인형 구매</strong><button id="qClose" type="button" style="border:0;background:#fff;font-size:23px;color:#333">×</button></div>'+
 '<div style="font-size:12px;color:#71677d;margin:3px 0" id="qChannel"></div>'+
 '<details id="qPicker" style="margin-top:8px;border:1px solid #e5daf0;border-radius:10px;padding:9px"><summary style="font-weight:750;cursor:pointer">＋ 인형 추가 · 검색/코드 입력</summary>'+
 '<label style="font-weight:600;display:block;margin-top:9px">인형 이름·상품코드 검색<input id="qSearch" placeholder="예: 밤토끼, D796" autocomplete="off" style="'+inputStyle+'"></label>'+
 '<label style="font-weight:600;display:block;margin-top:7px">선택할 상품 (품절 포함)<select id="qSku" style="'+inputStyle+'"><option value="">상품 목록 불러오는 중…</option></select></label>'+
 '<div style="display:flex;gap:6px;align-items:end;margin-top:6px"><label style="flex:1;font-size:12px">목록에 없는 상품코드로 미리 설정<input id="qManualSku" style="'+inputStyle+'" placeholder="예: D796" maxlength="24" autocapitalize="characters"></label><button id="qUseSku" type="button" style="border:1px solid #cbbadf;background:#f9f6fe;color:#563886;border-radius:9px;padding:9px;white-space:nowrap;font-weight:700">코드 적용</button></div>'+
 '<div id="qProduct" style="font-size:12px;color:#6b5677;margin:7px 0"></div>'+
 '<div style="'+rowStyle+'"><label style="flex:1">구매 단위<select id="qOpt" style="'+inputStyle+'"><option value="single">낱개 1개</option><option value="fullbox">풀박스 1세트</option></select></label><button id="qAdd" type="button" style="align-self:end;border:0;border-radius:8px;background:#7150a5;color:#fff;padding:9px;font-weight:750">＋ 등록</button></div></details>'+
 '<div style="font-size:12px;font-weight:700;color:#624c78;margin:7px 0">감시 목록 · 재고 있는 상품만 함께 구매</div>'+
 '<div id="qWatchList" style="display:grid;gap:5px"></div>'+
 '<label style="font-size:12px;display:block;margin:7px 0">서버 확인 주기<select id="qCycle" style="'+inputStyle+'"><option value="5">5초 (요청 많음)</option><option value="8">8초 (기본)</option><option value="10">10초</option><option value="15">15초</option><option value="30">30초</option><option value="60">60초</option></select></label>'+
 '<div style="'+rowStyle+'"><label style="flex:1;min-width:125px">개봉 옵션<select id="qOpen" style="'+inputStyle+'"><option value="개봉">개봉</option><option value="미개봉">미개봉</option><option value="카드개봉">카드개봉</option></select></label><label style="flex:1;min-width:120px">받는 방법<select id="qStorage" style="'+inputStyle+'"><option value="보관">보관</option><option value="발송">바로 배송</option></select></label></div>'+
 '<div style="background:#f6f0ff;padding:10px;border-radius:10px;margin:9px 0">'+
  '<label style="display:flex;gap:7px;align-items:start;margin:5px 0;font-weight:700"><input type="checkbox" id="qAutoOrder"> 공식 동의 2단계 및 최종 주문 자동 클릭</label>'+
  '<label style="display:flex;gap:7px;align-items:start;margin:5px 0"><input type="checkbox" id="qDryRun" checked> 무전송 시험 (최종 주문 생성 안 함 · 기본)</label>'+
  '<label style="display:flex;gap:7px;align-items:start;margin:5px 0"><input type="checkbox" id="qPayAuto"> 주문번호 확인 후 페이앱 결제창 열기 시도</label>'+
  '<small style="color:#65566c">실제 주문은 자동 클릭 ON + 무전송 시험 OFF + 명시 동의가 모두 필요해. 결제 승인은 직접 진행해.</small></div>'+
 '<div id="qStatus" role="status" style="font-weight:700;padding:8px 9px;background:#f5effc;border-radius:8px;margin:9px 0">📦 상품 목록을 불러오는 중…</div>'+
 '<div style="display:flex;gap:7px;margin-top:8px"><button id="qStart" type="button" style="flex:1;border:0;border-radius:10px;padding:11px;background:#6b4aac;color:#fff;font-weight:700">대기 시작</button><button id="qStop" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">중지</button><button id="qLoad" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">목록 갱신</button></div>'+
 '<button id="qReload" type="button" hidden style="display:none;width:100%;margin-top:8px;border:0;border-radius:9px;background:#332340;color:#fff;padding:11px;font-weight:700">🛒 판매 가능 확인 · 공식 화면 새로고침</button>'+
 '<details id="qTiming" style="margin:9px 0;padding:10px;border:1px solid #d7c4e7;background:#faf7ff;border-radius:10px"><summary style="cursor:pointer;font-weight:750">⏱️ 자동주문 구간별 속도 기록 (로컬 저장)</summary>'+
 '<div id="qTimingSummary" style="margin:6px 0;font-size:12px;color:#4c376a">대기 시작 후 기록이 표시돼.</div>'+
 '<pre id="qTimingLog" style="white-space:pre-wrap;word-break:break-word;max-height:176px;overflow:auto;font:11px/1.5 ui-monospace,monospace;color:#3e3452">아직 기록이 없어.</pre>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="qTimingCopy" style="border:1px solid #c2afd6;background:#fff;padding:8px;border-radius:7px">📋 기록 복사</button><button type="button" id="qTimingDownload" style="border:1px solid #c2afd6;background:#fff;padding:8px;border-radius:7px">💾 JSON 저장</button></div>'+
 '<small style="display:block;color:#756b80;margin-top:7px">자동 측정 · 0.1ms 정밀도 기록 · 세션 내 저장. 실제 재입고 시각은 알 수 없으므로 최초 판매 가능 응답부터 측정해. 주문 성공과 서버 접수를 의미하지 않아.</small></details>'+
 '<small style="display:block;color:#766d7f;margin-top:9px">한 주문에 상품 여러 개를 담되 품절인 상품은 제외해. 개봉·수령 방법은 모든 상품에 공통 적용돼. 품절이어도 설정하고 대기할 수 있어. 품절 또는 목록에 없는 코드일 때는 재고가 공식 서버에서 확인될 때까지 주문이나 장바구니 변경 없이 기다려. 주문 접수 또는 사이트 LIVE 표시와 선택 상품 재고를 확인해. LIVE 표시는 실제 구매 보장이 아니야. 공식 주문 UI 활성화가 필요하고 무전송 시험에서 최종 주문을 생성하지 않아. 5초 감시는 요청 제한 위험이 있어.</small>';
 document.body.appendChild(panel);
 const controls={search:el('#qSearch',panel),manual:el('#qManualSku',panel),sku:el('#qSku',panel),opt:el('#qOpt',panel),cycle:el('#qCycle',panel),open:el('#qOpen',panel),storage:el('#qStorage',panel),pay:el('#qPayAuto',panel),autoOrder:el('#qAutoOrder',panel),dryRun:el('#qDryRun',panel),status:el('#qStatus',panel),product:el('#qProduct',panel),reload:el('#qReload',panel),
 timingSummary:el('#qTimingSummary',panel),timingLog:el('#qTimingLog',panel),watchList:el('#qWatchList',panel),picker:el('#qPicker',panel)};
 // Instrumentation only. No extra site requests, no order submission,
 // no recording of auth cookies, customer details, or generated order numbers.
 const TIMING_KEY='bbp_general_v2_timing_last_'+STORE;
 const TIMING_LABELS={
  started:'대기 시작', initial_cart:'시작 전 장바구니 준비', first_poll:'첫 서버 조회 시작',
  poll_sample:'서버 조회 구간 표본', poll_error:'서버 조회 문제',
  sellable:'공식 상품 RPC 판매 가능 최초 확인', window_open:'주문 접수/LIVE 상태 확인',
  cart_ready:'장바구니·선택 옵션 준비', both_ready:'재고+접수 조건 모두 확인',
  official_ui_wait:'공식 주문 화면 반영 대기', route_refresh:'공식 화면 내부 경로 갱신',
  official_ui_ready:'공식 화면 주문 버튼 활성 확인', cart_click:'장바구니 열기 클릭 호출',
  cart_panel:'공식 장바구니 패널 표시', option_ok:'개봉/보관 옵션 확인',
  checkout_click:'주문 확인창 열기 클릭 호출', confirm_visible:'주문 확인창 표시',
  agree_step1:'1단계 확인/계속 클릭 호출', final_visible:'최종 주문 확인 단계 표시',
  dry_run_stop:'무전송 시험 · 최종 주문 클릭 생략',
  submit_click:'최종 주문 버튼 클릭 호출 (접수/주문번호 미확인)',
  pay_panel:'새 주문번호가 표시된 결제 패널 확인', pay_click:'결제창 열기 버튼 클릭 호출',
  stopped:'감시 중지', hidden:'브라우저 백그라운드 전환', resumed:'브라우저 다시 표시',
  safety_stop:'안전장치로 자동 단계 중지'
 };
 let timingActive=false,timingEvents=[],timingOnceKeys=new Set(),timingStartPerf=0,timingSaleablePerf=null,
  timingStartedAt=null,timingMode='',timingSku='',timingCycle=8,timingPersistTimer=null;
 let timingStats={checks:0,errors:0,lastRoundMs:null,minRoundMs:null,maxRoundMs:null,rpc:{}};
 const ms=n=>Math.round(n*10)/10;
 function timingReport(){
  return {kind:'bebepick-quick-order-timing-v22',version:'2.2.1',createdAt:new Date().toISOString(),
   store:STORE,sku:timingSku,option:option,intervalSeconds:timingCycle,mode:timingMode,
   startedAt:timingStartedAt,stats:timingStats,events:timingEvents,
   note:'Browser observation only. LIVE/stock observed time is not actual opening time. Click called is not order accepted. Contains no order number, token, account information, or message body.'};
 }
 function persistTimingSoon(){
  if(timingPersistTimer!==null)return;
  timingPersistTimer=setTimeout(()=>{timingPersistTimer=null;
   try{sessionStorage.setItem(TIMING_KEY,JSON.stringify(timingReport()));}catch(e){}
  },300);
 }
 function timingRender(){
  const recent=timingEvents.slice(-15);
  controls.timingLog.textContent=recent.length?recent.map(x=>
   x.elapsedMs.toFixed(1)+'ms · '+(TIMING_LABELS[x.event]||x.event)+(x.sinceSellableMs===null?'':' (재고 확인 후 '+x.sinceSellableMs.toFixed(1)+'ms)')+
   (x.detail?' · '+x.detail:'')
  ).join('\n'):'아직 기록이 없어.';
  const milestones=n=>timingEvents.find(x=>x.event===n);
  const a=milestones('sellable'),b=milestones('checkout_click');
  const span=a&&b?(b.elapsedMs-a.elapsedMs).toFixed(1)+'ms':'측정 대기';
  const avg=timingStats.checks?((timingStats.minRoundMs??0)+'~'+(timingStats.maxRoundMs??0)+'ms'):'—';
  controls.timingSummary.textContent='공식 판매가능 확인 → 확인창 열기 클릭: '+span+' · 조회 '+timingStats.checks+'회 · 조회 구간 '+avg;
 }
 function timingMark(event,detail){
  if(!timingActive)return;
  const now=performance.now(),sinceSellable=timingSaleablePerf===null?null:ms(now-timingSaleablePerf);
  if(event==='sellable'&&timingSaleablePerf===null)timingSaleablePerf=now;
  timingEvents.push({event,at:new Date().toISOString(),elapsedMs:ms(now-timingStartPerf),
   sinceSellableMs:event==='sellable'?0:sinceSellable,detail:String(detail||'').slice(0,80)});
  // Preserve the start and the first milestone entries if waiting for hours.
  if(timingEvents.length>260){
   let cut=timingEvents.findIndex((x,i)=>i>0&&x.event==='poll_sample');
   if(cut<1)cut=timingEvents.findIndex((x,i)=>i>0&&x.event==='poll_error');
   if(cut<1)cut=1;
   timingEvents.splice(cut,1);
  }
  timingRender();persistTimingSoon();
 }
 function timingOnce(event,detail){
  if(!timingActive||timingOnceKeys.has(event))return;
  timingOnceKeys.add(event);timingMark(event,detail);
 }
 function timingStart(){
  timingActive=true;timingEvents=[];timingOnceKeys.clear();timingStartPerf=performance.now();timingSaleablePerf=null;
  timingStartedAt=new Date().toISOString();timingSku=watchItems.map(x=>x.sku).join(',');timingCycle=cycle;
  timingMode=autoOrder?(dryRun?'무전송 자동 확인':'명시 동의 실제 주문'):'수동 최종 확정';
  timingStats={checks:0,errors:0,lastRoundMs:null,minRoundMs:null,maxRoundMs:null,rpc:{}};
  timingMark('started',timingMode);
 }
 function timingRpc(fn,elapsed){
  if(!timingActive||(fn!=='list_products'&&fn!=='order_windows'))return;
  const t=ms(elapsed),stats=timingStats.rpc[fn]||{count:0,lastMs:null,minMs:null,maxMs:null,meanMs:null};
  stats.meanMs=ms(((stats.meanMs||0)*stats.count+t)/(stats.count+1));
  stats.count++;stats.lastMs=t;stats.minMs=stats.minMs===null?t:Math.min(stats.minMs,t);
  stats.maxMs=stats.maxMs===null?t:Math.max(stats.maxMs,t);
  timingStats.rpc[fn]=stats;
 }
 function timingRound(elapsed,failed){
  if(!timingActive)return;
  timingStats.checks++;
  const t=ms(elapsed);timingStats.lastRoundMs=t;
  timingStats.minRoundMs=timingStats.minRoundMs===null?t:Math.min(timingStats.minRoundMs,t);
  timingStats.maxRoundMs=timingStats.maxRoundMs===null?t:Math.max(timingStats.maxRoundMs,t);
  if(failed)timingStats.errors++;
  if(timingStats.checks===1||timingStats.checks%10===0||failed)timingMark(failed?'poll_error':'poll_sample','조회 '+timingStats.checks+'회차 · '+t+'ms');
  else persistTimingSoon();
 }
 function timingStop(detail){
  if(!timingActive)return;
  timingMark('stopped',detail||'종료');timingActive=false;
  if(timingPersistTimer!==null){clearTimeout(timingPersistTimer);timingPersistTimer=null;}
  try{sessionStorage.setItem(TIMING_KEY,JSON.stringify(timingReport()));}catch(e){}
 }
 function timingExport(){
  // Export only already-observed timings; contains no response body, order number, or authorization.
  return JSON.stringify(timingReport(),null,2);
 }
 try{
  const last=JSON.parse(sessionStorage.getItem(TIMING_KEY)||'null');
  if(last&&last.kind==='bebepick-quick-order-timing-v22'&&last.store===STORE&&Array.isArray(last.events)){
   timingEvents=last.events.slice(0,260);timingStats=last.stats||timingStats;
   timingSku=String(last.sku||'');timingCycle=Number(last.intervalSeconds)||8;
   timingMode=String(last.mode||'');timingStartedAt=String(last.startedAt||'');
   timingRender();controls.timingSummary.textContent+=' · 이전 페이지 기록 (새 시작 시 초기화)';
  }
 }catch(e){}
 el('#qTimingCopy',panel).onclick=async()=>{
  const data=timingExport();
  try{await navigator.clipboard.writeText(data);message('📋 속도 기록 복사 완료 · 채팅에 붙여넣어 줘');}
  catch(e){const t=document.createElement('textarea');t.value=data;t.style.cssText='width:100%;height:90px';el('#qTiming',panel).appendChild(t);t.select();message('복사 제한됨 · 아래 선택된 JSON을 수동으로 복사해 줘');}
 };
 el('#qTimingDownload',panel).onclick=()=>{
  const blob=new Blob([timingExport()],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='bebepick-speed-'+STORE+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  message('💾 속도 기록 JSON 저장 완료 · 공유 전 내용을 확인해 줘');
 };
 el('#qChannel',panel).textContent='현재 주문몰: '+(STORE==='main'?'베베픽':'베베픽 플러스');
 const mini=document.createElement('button');
 mini.type='button';mini.hidden=true;mini.id='bbpQuickGeneralV23Mini';
 mini.style.cssText='position:fixed;z-index:2147483644;top:118px;right:9px;max-width:205px;padding:8px 10px;background:#69459f;color:white;border:0;border-radius:999px;box-shadow:0 4px 16px #0004;font:700 11px/1.35 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
 mini.textContent='🧸 주문 화면 확인 중 · 펼치기';document.body.appendChild(mini);
 let folded=false,lastScrolledStage='';
 mini.onclick=()=>{folded=false;mini.hidden=true;panel.style.display='block';};
 function message(t){
  controls.status.textContent=t;
  if(folded)mini.textContent='🧸 '+String(t).replace(/^[^\w가-힣]+/,'').slice(0,20)+' · 펼치기';
 }
 function show(){folded=false;mini.hidden=true;panel.style.display='block';}
 function foldForOfficial(){
  if(folded)return;
  folded=true;panel.style.display='none';mini.hidden=false;
  message('공식 주문 화면 확인 중');revealOfficialStage();
 }
 function revealOfficialStage(){
  if(!folded||document.hidden)return;
  let stage='',target=null;
  const confirm=el('.oc[role="alertdialog"] .oc-box');
  if(confirm){
   target=confirm.querySelector('[data-oc="ok"]')||confirm.querySelector('[data-oc="next"]')||confirm;
   stage=confirm.querySelector('[data-oc="ok"]')?'final':'first';
  }else{
   const pay=el('.panel[data-sheet="pay"]');
   const cart=el('.panel[data-sheet="cart"]');
   if(pay&&!pay.hidden){target=pay.querySelector('[data-act="pay-card"]')||pay;stage='payment';}
   else if(cart&&!cart.hidden){target=cart.querySelector('#checkout')||cart;stage='cart';}
  }
  if(!target||stage===lastScrolledStage)return;
  lastScrolledStage=stage;
  // We only scroll to an official button already shown. No click is added.
  requestAnimationFrame(()=>{try{if(target.isConnected)target.scrollIntoView({block:'end',inline:'nearest',behavior:'auto'});}catch(e){}});
 }
 function stop(){timingStop('감시 또는 안전장치 중지');active=false;confirmed=false;if(timer)clearTimeout(timer);timer=null;
   if(cartTimer)clearInterval(cartTimer);cartTimer=null;cartProgress=null;
   if(wizardTimer)clearInterval(wizardTimer);wizardTimer=null;
   controllers.forEach(c=>c.abort());controllers.clear();polling=false;payArmed=false;autoOrder=false;
  }
  function endPolling(){active=false;if(timer)clearTimeout(timer);timer=null;controllers.forEach(c=>c.abort());controllers.clear();polling=false;}
  function recentSubmit(){try{const prev=JSON.parse(sessionStorage.getItem('bbp_general_v2_submit_'+STORE)||'null');return prev&&Date.now()-prev.at<180000?prev:null;}catch(e){return null;}}
 function config(){const c=window.APP_CONFIG||{};if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('공식 홈페이지 서버 설정 없음');const base=String(c.supabaseUrl).replace(/\/$/,'');if(base!=='https://eqytdtxemjlygnobhiio.supabase.co')throw Error('공식 서버가 예상한 주소와 다름');return {base:base,key:c.supabaseAnonKey};}
 async function rpc(fn,args){const rpcAt=performance.now(),c=config(),ctl=new AbortController();controllers.add(ctl);const to=setTimeout(()=>ctl.abort(),7500);
  try{
    const headers={apikey:c.key,'content-type':'application/json',accept:'application/json'};
    try{const user=JSON.parse(localStorage.getItem('sb-eqytdtxemjlygnobhiio-auth-token')||'null');
      if(user&&typeof user.access_token==='string'&&Number(user.expires_at)>Math.floor(Date.now()/1000)+10)headers.authorization='Bearer '+user.access_token;
    }catch(e){}
    const r=await fetch(c.base+'/rest/v1/rpc/'+fn,{method:'POST',credentials:'omit',cache:'no-store',mode:'cors',signal:ctl.signal,headers,body:JSON.stringify(args||{})});
   if(!r.ok){const e=new Error('HTTP '+r.status+' '+fn);e.httpStatus=r.status;throw e;}return await r.json();
  }finally{timingRpc(fn,performance.now()-rpcAt);clearTimeout(to);controllers.delete(ctl);}
 }
 function validSku(value){return /^[A-Z0-9-]{2,24}$/.test(String(value||''));}
 function visibleProducts(){return catalog.filter(availableHere);}
 function stockLabel(p){
  if(p.stock==='out')return '🔴 품절 · 재입고 대기';
  if(p.stock==='low'||p.stock===null)return '🟢 판매 재고 표시';
  return '⚪ 판매 상태 확인 필요';
 }
 function fillCatalog(){
  const q=controls.search.value.toLocaleLowerCase('ko-KR').replace(/\s+/g,'');
  const list=visibleProducts().filter(p=>(String(p.name||'')+' '+p.sku).toLocaleLowerCase('ko-KR').replace(/\s+/g,'').includes(q))
    .sort((a,b)=>Number(saleable(b))-Number(saleable(a))).slice(0,150);
  controls.sku.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=list.length?'상품을 선택해 줘':'검색 결과 없음';
  controls.sku.append(placeholder);
  const inCatalog=list.some(p=>p.sku===sku);
  // 저장된 SKU가 품절로 목록에서 사라져도 임의로 삭제하지 않아.
  const ghost=sku&&!inCatalog&&(!q||sku.toLocaleLowerCase('ko-KR').includes(q));
  if(ghost){
   const missing=document.createElement('option');missing.value=sku;missing.textContent='⏳ '+sku+' · 목록에 없음 (코드 대기)';
   controls.sku.append(missing);
  }
  list.forEach(p=>{const o=document.createElement('option');o.value=p.sku;o.textContent=label(p)+' · '+stockLabel(p)+(p.has_fullbox&&p.fullbox_out?' · 풀박스 품절':'');controls.sku.append(o);});
  controls.sku.value=inCatalog||ghost?sku:'';
 }
 function renderWatchList(){
  controls.watchList.replaceChildren();
  if(!watchItems.length){controls.watchList.textContent='감시할 인형이 없어 · 위에서 추가해 줘';return;}
  watchItems.forEach((w,i)=>{
   const p=productFor(w),row=document.createElement('div');
   row.style.cssText='display:flex;align-items:center;gap:6px;padding:7px;background:#faf7ff;border:1px solid #e8e0ef;border-radius:9px';
   const names=document.createElement('div');names.style.cssText='flex:1;min-width:0;font-size:12px';
   const title=document.createElement('div');title.style.cssText='font-weight:750;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
   title.textContent=(i+1)+'. '+String(p?.name||w.sku);
   const sub=document.createElement('div');sub.style.cssText='font-size:11px;color:#786989';sub.textContent=w.sku+' · '+(w.option==='fullbox'?'풀박스 1세트':'낱개 1개');
   names.append(title,sub);
   const status=document.createElement('small');status.style.cssText='font-size:11px;color:'+(p?(saleableFor(p,w.option)?'#248854':'#b34963'):'#7a6d80');
   status.textContent=p?(saleableFor(p,w.option)?'● 재고 있음':'● 품절'):'● 목록 대기';
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.disabled=active||completed;
   remove.style.cssText='background:white;border:1px solid #dccce9;border-radius:6px;padding:2px 7px;font-size:16px';
   remove.onclick=()=>{if(active||completed)return;watchItems.splice(i,1);saveWatchList();renderWatchList();message('목록에서 삭제했어 · 공식 장바구니는 변경하지 않았어');};
   row.append(names,status,remove);controls.watchList.append(row);
  });
 }
 function addWatchSku(raw,unit){
  const code=String(raw||'').trim().toUpperCase(),opt=unit==='fullbox'?'fullbox':'single';
  if(active||completed){message('⚠ 대기를 먼저 중지해야 변경할 수 있어');return false;}
  if(!validSku(code)){message('⚠ 올바른 상품 코드를 입력해 줘');return false;}
  if(watchItems.some(x=>x.sku===code&&x.option===opt)){message('이미 등록된 상품이야');return false;}
  if(watchItems.length>=MAX_WATCH){message('⚠ 최대 10개까지 등록할 수 있어');return false;}
  const p=catalog.find(x=>x&&x.sku===code&&availableHere(x));
  if(p&&!allowedOption(p,opt)){message('⚠ 이 상품의 풀박스는 지원되지 않아');return false;}
  watchItems.push({sku:code,option:opt,qty:1});saveWatchList();renderWatchList();controls.picker.open=false;
  message('✅ '+code+' 등록 · 총 '+watchItems.length+'개 감시');
  return true;
 }
 function updateInfo(){
  const p=target(),valid=!!p&&allowedOption(p);
  // 목록에서 사라진 상품은 풀박스 지원 여부가 미확인. 기존 선택값을 바꾸지 않아.
  const fullbox=controls.opt.querySelector('[value="fullbox"]');
  fullbox.disabled=!!p&&(!p.has_fullbox||!p.pack_size||Number(p.pack_size)<=1);
  if(option==='fullbox'&&fullbox.disabled){option='single';controls.opt.value='single';savePref();}
  const price=p?(option==='fullbox'?p.fullbox_price:p.price):null;
  controls.product.textContent=p?(label(p)+' · '+(option==='fullbox'?'세트 '+p.pack_size+'개':labels.single)+' · '+money(price)+' · '+(saleable(p)?'🟢 재고 표시 있음 · 주문 조건 대기':option==='fullbox'&&p.fullbox_out?'🔴 풀박스 품절 · 재입고 대기':stockLabel(p))):
     sku?'⏳ '+sku+' · 공식 상품 목록에서 아직 확인되지 않아. 코드는 저장할 수 있고, 목록에 나타나기 전에는 주문을 시도하지 않아.':'상품을 선택해 줘';
  return valid;
 }
 async function loadCatalog(silent){if(!silent)message('📦 공식 상품 목록 확인 중…');
  try{const p=await rpc('list_products',{p_brand:STORE});if(!Array.isArray(p))throw Error('상품 응답 형식이 예상과 다름');catalog=p;fillCatalog();updateInfo();renderWatchList();
   if(!silent)message('✅ 상품 '+visibleProducts().length+'개 확인 (품절 포함) · 선택 후 재입고 대기 가능');
   return true;
  }catch(e){message('⚠ 상품 목록을 불러오지 못했어: '+String(e.message||e));return false;}
 }
 function saveSettings(){if(active){stop();message('⚙ 설정이 바뀌어 대기를 멈췄어. 다시 시작을 눌러 줘.');}
  if(completed){message('주문 진행 후 설정 변경은 새로고침해 줘');return;}
  sku=controls.sku.value||sku;option=controls.opt.value==='fullbox'?'fullbox':'single';cycle=allowed.includes(+controls.cycle.value)?+controls.cycle.value:8;
  open=controls.open.value;storage=controls.storage.value;savePref();updateInfo();
 }
 async function prepare(){
  if(!armedItems.length){message('⚠ 공식 서버에서 확인된 구매 가능 상품이 없어');return false;}
  if(!armedItems.every(w=>saleableFor(productFor(w),w.option))){
   message('⚠ 준비 중 한 상품의 재고 상태가 변경돼 · 자동주문 중지');return false;
  }
  let original;try{original=readCart();}catch(e){message('⚠ 장바구니 읽기 오류');return false;}
  const existing=original.filter(belongs);
  if(!cartMatches(existing,armedItems)){
   if(existing.length&&!cartReplaceConsent){
    message('⚠ 기존 장바구니 변경에 대한 사전 동의가 없어 · 자동주문 중지');return false;
   }
   const sameStoreItems=armedItems.map(w=>({sku:w.sku,opt:w.option,qty:1,store:STORE,
    lid:Date.now().toString(36)+Math.random().toString(36).slice(2,8)}));
   const next=original.filter(x=>!belongs(x)).concat(sameStoreItems);
   try{
    localStorage.setItem(CART_KEY,JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage',{key:CART_KEY}));
   }catch(e){message('⚠ 공식 장바구니에 상품 묶음 준비 실패');return false;}
   if(!expected()){
    // Best effort restore only if our own cart write did not stick.
    message('⚠ 장바구니 구성 확인 실패 · 주문 진행 중지');return false;
   }
  }
  return prefill();
 }
 function prefill(){try{let v={};try{v=JSON.parse(sessionStorage.getItem(OPTS_KEY)||'{}')||{};}catch(e){}
  v.open=open;v.storage=storage;v.use_credit=0;v.use_prize=0;v.use_free_ship=false;v.use_priority=false;v.store=STORE;sessionStorage.setItem(OPTS_KEY,JSON.stringify(v));return true;
 }catch(e){message('⚠ 개봉·보관 옵션을 미리 저장하지 못했어');return false;}}
 function serverOpen(w){return !!(w&&w.reason!=='paused'&&((w.open===true&&w.enabled!==false&&w.closed!==true)||w.yt_live===true));}
  function openMode(w){return w&&w.open===true&&w.enabled!==false&&w.closed!==true?'주문 접수':w&&w.yt_live===true&&w.reason!=='paused'?'LIVE 표시':'';}
  function matchesStorage(value){const v=String(value||'').trim();return storage==='발송'?(v==='발송'||v==='바로 배송'):(v==='보관');}
 function latestAvailability(p){return p? (saleable(p)?'판매 가능':option==='fullbox'?'세트 품절':'품절'):'확인 실패';}
 function schedule(delay){if(timer)clearTimeout(timer);if(active&&!confirmed)timer=setTimeout(poll,delay);}
 async function poll(){
  if(!active||polling||confirmed)return;
  if(document.hidden){message('📱 화면이 다시 보이면 감시 재개');schedule(cycle*1000);return;}
  if(cartPrepared&&!expected()){stop();message('⚠ 주문 대상 장바구니가 바뀌어 감시 중지');return;}
  polling=true;const started=performance.now();timingOnce('first_poll');
  try{
   // One pair of RPC calls regardless of the number of dolls monitored.
   const res=await Promise.allSettled([rpc('order_windows',{}),rpc('list_products',{p_brand:STORE})]);
   timingRound(performance.now()-started,res.some(x=>x.status==='rejected'));
   if(!active)return;
   let windowOk=null,failed=[],eligible=[];
   if(res[0].status==='fulfilled'){
    const w=res[0].value&&res[0].value[STORE];
    if(w&&(typeof w.open==='boolean'||typeof w.yt_live==='boolean')){
     windowOk=serverOpen(w);triggerMode=openMode(w);
     if(windowOk)timingOnce('window_open',triggerMode);
    }else failed.push(new Error('주문 접수 응답 형식 오류'));
   }else failed.push(res[0].reason);
   if(res[1].status==='fulfilled'&&Array.isArray(res[1].value)){
    catalog=res[1].value;eligible=eligibleNow();renderWatchList();
    if(eligible.length)timingOnce('sellable','판매 가능 '+eligible.map(x=>x.sku).join(','));
   }else failed.push(res[1].status==='rejected'?res[1].reason:new Error('상품 응답 형식 오류'));
   if(failed.length){
    tries++;
    if(failed.some(e=>e&&[401,403].includes(e.httpStatus))){stop();message('⚠ 서버 조회 거절 · 감시 중지');return;}
    const delay=failed.some(e=>e&&e.httpStatus===429)?60000:Math.min(120000,cycle*1000*Math.pow(2,Math.min(tries,4)));
    message('⚠ 조회 오류 · '+Math.round(delay/1000)+'초 후 재시도');schedule(delay);return;
   }
   tries=0;
   if(windowOk&&eligible.length){
    // Frozen one-time subset. Unavailable dolls are not added to this order.
    armedItems=eligible.map(x=>({...x}));
    sku=armedItems[0].sku;option=armedItems[0].option;
    timingMark('batch_selected','주문 '+armedItems.map(x=>x.sku).join(',')+' · 품절 제외 '+(watchItems.length-armedItems.length));
    if(!await prepare()){
     stop();message('⚠ 구매 가능한 인형을 공식 장바구니로 준비하지 못했어 · 주문 중지');return;
    }
    cartPrepared=true;timingOnce('cart_ready','판매 가능한 상품 '+armedItems.length+'개 준비');
    if(!expected()){stop();message('⚠ 장바구니 재검증 실패 · 주문 중지');return;}
    confirmed=true;confirmedAt=Date.now();
    timingOnce('both_ready',armedItems.length+'개 · '+triggerMode);
    message('✅ '+armedItems.map(x=>x.sku).join(', ')+' · '+armedItems.length+'개 구매 준비 · 공식 주문창 이동');
    handoff();return;
   }
   message('⏳ '+watchItems.length+'개 감시 · 재고 '+eligible.length+'개 · '+(windowOk?'주문 접수':'공식 주문 접수 대기')+' · '+new Date().toLocaleTimeString('ko-KR',{hour12:false}));
   schedule(cycle*1000);
  }catch(e){
   tries++;timingMark('poll_error','감시 처리 예외');
   message('⚠ 감시 처리 오류 · 지연 후 재시도');
   schedule(Math.min(120000,cycle*2000*Math.pow(2,Math.min(tries,4))));
  }finally{polling=false;}
 }
 function reloadShow(){timingOnce('official_ui_wait','공식 DOM 주문상태 반영 대기');controls.reload.style.display='block';controls.reload.hidden=false;message('🔄 서버 판매 가능 후보 확인 · 공식 상품 화면 갱신 대기');if(!routeBusy&&Date.now()-lastRouteAt>5500)refreshRoute();}
  function refreshRoute(){
   if(routeBusy||!active||document.hidden)return;
   if(location.hash&&location.hash!=='#'){endPolling();message('⚠ 다른 경로 이동 감지 · 수동 확인 필요');return;}
   routeBusy=true;lastRouteAt=Date.now();timingOnce('route_refresh','사이트 경로 내부 갱신');
   history.replaceState(history.state,'',location.pathname+location.search+'#terms');
   window.dispatchEvent(new Event('hashchange'));
   setTimeout(()=>{
    if(!active){routeBusy=false;return;}
    history.replaceState(history.state,'',location.pathname+location.search);
    window.dispatchEvent(new Event('hashchange'));
    setTimeout(()=>{routeBusy=false;if(active)handoff();},1200);
   },250);
  }
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
  const w=el('#storeBar .sb-order.open');
  const shopFresh=armedItems.length>0&&armedItems.every(row=>{
   const node=el('[data-ctl="'+row.sku+'"]'),card=node&&node.closest('.prod');
   return !!(card&&!card.classList.contains('soldout')&&(row.option==='single'||!card.classList.contains('fbout')));
  });
  if((!w&&triggerMode!=='LIVE 표시')||!shopFresh){reloadShow();return;}
  const btn=el('#cartBar .cb-submit')||el('#btnTopCart:not([hidden])');
  if(!btn||btn.disabled){reloadShow();return;}
   if(Date.now()-confirmedAt>Math.max(10000,cycle*2000)){confirmed=false;message('🔄 구매 직전 공식 서버 재확인');poll();return;}
  timingOnce('official_ui_ready','공식 주문 버튼 활성화');endPolling();completed=true;message('✅ 공식 장바구니·주문창 여는 중…');
  timingOnce('cart_click','버튼 호출 · 주문 생성 아님');btn.click();
  foldForOfficial();
  // Progress on DOM mutation with a 50ms fallback; no extra server requests.
  const cartWaitUntil=performance.now()+2500;
  let lastCartCheckAt=-Infinity;
  const progressCart=()=>{
   if(!cartTimer||cartProgress!==progressCart)return;
   const now=performance.now();
   if(now-lastCartCheckAt<40)return; // prevent rapid double-toggle mutations
   lastCartCheckAt=now;
   const fail=why=>{
    if(performance.now()<cartWaitUntil)return;
    clearInterval(cartTimer);cartTimer=null;cartProgress=null;
    timingMark('safety_stop',why);
    message('⚠ '+why+' · 직접 확인해 줘.');
   };
   const cartPanel=el('.panel[data-sheet="cart"]');
   if(!cartPanel){fail('장바구니를 열지 못했어');return;}
   timingOnce('cart_panel');
   if(!correctOrderControls(cartPanel)){fail('주문 옵션 '+open+'·'+storage+'을 자동 확인하지 못했어');return;}
   timingOnce('option_ok',open+' + '+storage);
   const next=el('#checkout',cartPanel);
   if(!next||next.disabled){fail('주문 버튼이 비활성화돼 있어');return;}
   clearInterval(cartTimer);cartTimer=null;cartProgress=null;
   if(!expected()){timingMark('safety_stop','장바구니 변경');message('⚠ 장바구니가 바뀌어 자동 진행 중단');return;}
   if(autoOrder){wizardStage=0;wizardStart=Date.now();submitClicked=false;wizardTimer=setInterval(watchWizard,50);}
   timingOnce('checkout_click','버튼 호출 · 주문 생성 아님');next.click();
   message(autoOrder?'📋 공식 주문 확인 2단계 · 선택값과 동의 확인 중':'📋 공식 확인창 · 최종 동의와 주문 확정은 직접 해 줘');
  };
  cartProgress=progressCart;
  cartTimer=setInterval(progressCart,50);
  queueMicrotask(progressCart);
 }
 controls.reload.onclick=()=>{if(!expected()){message('⚠ 장바구니 내용을 확인해 줘');return;}location.assign(STORE==='main'?'https://bebepick.me/live':'https://bebepick.me/plus');};
 el('#qStart',panel).onclick=async()=>{
  if(completed){message('⚠ 이전 주문 시도가 있어 · 새로고침 후 다시 시도해 줘');return;}
  if(active){message('⏳ 이미 감시 중이야');return;}
  if(!watchItems.length){message('⚠ 인형을 먼저 감시 목록에 추가해 줘');controls.picker.open=true;return;}
  if(!catalog.length)await loadCatalog(false);
  cycle=allowed.includes(+controls.cycle.value)?+controls.cycle.value:8;
  open=controls.open.value;storage=controls.storage.value;savePref();saveWatchList();
  autoOrder=!!controls.autoOrder.checked;dryRun=!!controls.dryRun.checked;autoPay=!!controls.pay.checked;
  if(autoOrder&&!dryRun&&recentSubmit()){message('⚠ 최근 주문 요청 이력이 있어 · 주문내역 확인 후 새로고침해 줘');return;}
  if(!watchItems.every(w=>validSku(w.sku)&&(!productFor(w)||allowedOption(productFor(w),w.option)))){
   message('⚠ 감시 목록에 지원하지 않는 상품/풀박스 구성이 있어');return;
  }
  if(autoOrder&&!dryRun){
   const names=watchItems.map(x=>x.sku+(x.option==='fullbox'?'[풀박스]':'[낱개]')).join(', ');
   if(!confirm('⚠ 여러 상품 실제 자동주문 동의\n\n감시 대상: '+names+
    '\n\n재고와 공식 주문 상태가 확인되는 순간, 재고 있는 상품만 골라 한 주문으로 묶고 최종 주문 버튼을 최대 1회 눌러. 품절 상품은 제외해.\n공통 옵션: '+open+' + '+storage+
    '\n\n주문 생성 후 취소·변경이 제한될 수 있고 결제는 직접 해야 해. 진행할까?'))return;
  }
  let existing;try{existing=readCart().filter(belongs);}catch(e){message('⚠ 장바구니 읽기 오류');return;}
  cartReplaceConsent=existing.length===0;
  if(existing.length){
   cartReplaceConsent=confirm('⚠ 공식 장바구니 상품 '+existing.length+'개가 있어.\n\n첫 재고 발견 시 실제 구매 가능한 감시 상품들로 이 몰의 기존 장바구니를 교체할 수 있어. 반대쪽 몰 상품은 그대로 유지해. 동의할까?');
   if(!cartReplaceConsent){message('⏸ 장바구니 교체 미동의 · 감시 시작 안 함');return;}
  }
  timingStart();armedItems=[];cartPrepared=false;awaitingCatalog=false;
  if(autoOrder&&dryRun&&autoPay)autoPay=false;
  active=true;confirmed=false;completed=false;tries=0;triggerMode='';routeBusy=false;
  controls.reload.hidden=true;controls.reload.style.display='none';
  renderWatchList();
  message('⏳ '+watchItems.length+'개 감시 · '+cycle+'초 조회 · '+open+' + '+storage+
   ' · 재고 있는 것만 구매 · '+(autoOrder?(dryRun?'무전송 시험':'실제 자동 주문'):'수동 확정')+' 모드');
  poll();
 };
 el('#qStop',panel).onclick=()=>{const sent=submitClicked;stop();message(sent?'⚠ 주문 요청을 이미 보냈을 수 있어 · 주문내역 확인':'⏸ 감시/확인 중지');};
 el('#qAdd',panel).onclick=()=>{
  addWatchSku(controls.sku.value||controls.manual.value.trim().toUpperCase(),controls.opt.value);
 };
 el('#qLoad',panel).onclick=()=>{if(active){message('⏳ 감시 중에는 목록 갱신하지 않아');return;}loadCatalog(false);};
 el('#qClose',panel).onclick=()=>{stop();panel.style.display='none';};
 controls.search.addEventListener('input',()=>{if(active){stop();message('⚙ 검색 변경으로 감시 중지');}fillCatalog();});
 controls.sku.addEventListener('change',()=>{if(controls.sku.value){sku=controls.sku.value;controls.manual.value=sku;}saveSettings();});
 el('#qUseSku',panel).onclick=()=>{
  if(completed){message('⚠ 이전 주문 진행 이력 있음 · 새로고침 필요');return;}
  if(active){message('⚠ 감시 중에는 먼저 중지해야 상품을 변경할 수 있어');return;}
  const code=controls.manual.value.trim().toUpperCase();
  if(!validSku(code)){message('⚠ 공식 상품코드로 입력해 줘 · 영문 대문자/숫자/하이픈 2~24자');return;}
  sku=code;controls.manual.value=code;controls.search.value='';fillCatalog();saveSettings();
  message(target()?'✅ '+label(target())+' · 품절이어도 설정 및 대기 가능':'⏳ '+sku+' 코드 저장 · 공식 상품목록에 나타날 때까지 주문 없이 대기 가능');
 };
 [controls.opt,controls.cycle,controls.open,controls.storage].forEach(e=>e.addEventListener('change',saveSettings));
 function abortWizard(why){timingMark('safety_stop',why);if(wizardTimer)clearInterval(wizardTimer);wizardTimer=null;autoOrder=false;payArmed=false;message('⛔ 자동 주문 중단 · '+why);}
 function watchWizard(){
  if(!autoOrder||submitClicked||!wizardTimer)return;
  if(Date.now()-wizardStart>22000){abortWizard('공식 확인창 시간 초과');return;}
  if(document.hidden){abortWizard('브라우저 백그라운드 전환');return;}
  if(!expected()){abortWizard('장바구니가 변경됨');return;}
  const box=el('.oc[role="alertdialog"] .oc-box');if(!box)return;
  if(box.querySelector('#ocConv')||box.querySelector('#ocConv2')||box.querySelector('[data-oc-agree="convert"]')){abortWizard('다른 주문의 보관/발송 변경 경고');return;}
  const st=box.querySelector('#ocStorage'),op=box.querySelector('#ocOpen'),next=box.querySelector('[data-oc="next"]');
  if(st&&op&&next){
   if(wizardStage!==0)return;
   if(!matchesStorage(st.textContent)||op.textContent.trim()!==open){abortWizard('1단계 수령/개봉 옵션 불일치');return;}
   const checks=Array.from(box.querySelectorAll('[data-oc-agree]'));
   if(checks.length!==2||checks.some(c=>!['storage','open'].includes(c.getAttribute('data-oc-agree')))){abortWizard('동의 항목이 기존과 달라 수동 확인 필요');return;}
   checks.forEach(c=>{c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});
   if(next.disabled){abortWizard('1단계 계속 버튼 비활성');return;}
   wizardStage=1;timingOnce('agree_step1','공식 동의 1단계 클릭');next.click();message('📋 1단계 선택값 확인 · 최종 주문 확인 중');return;
  }
  const fs=box.querySelector('#ocStorage2'),fo=box.querySelector('#ocOpen2'),ok=box.querySelector('[data-oc="ok"]');
  if(!fs||!fo||!ok)return;
   timingOnce('final_visible','2단계 확인창 DOM 표시');
  if(!matchesStorage(fs.textContent)||fo.textContent.trim()!==open){abortWizard('최종 선택값 불일치');return;}
  if(dryRun){timingOnce('dry_run_stop','최종 주문 클릭 0회');abortWizard('무전송 시험 성공 · 실제 주문 요청 0회');return;}
  const all=box.querySelector('#ocAll');
  if(!all){abortWizard('최종 동의 항목 없음');return;}
  if(wizardStage===1){
   wizardStage=2;finalAgreeAt=Date.now();all.checked=true;all.dispatchEvent(new Event('change',{bubbles:true}));
   message('✅ 최종 동의 완료 · 공식 주문 버튼 활성화 대기');return;
  }
  if(wizardStage!==2)return;
  if(Date.now()-finalAgreeAt>4000){abortWizard('최종 주문 버튼 활성화 시간 초과');return;}
  if(ok.disabled||!all.checked||!box.isConnected)return;
  if(recentSubmit()){abortWizard('중복 주문 요청 방지');return;}
  if(!expected()){abortWizard('제출 직전 장바구니 옵션 불일치');return;}
  const prior=el('.panel[data-sheet="pay"]');
  const m=(prior&&prior.textContent||'').match(/\bBP[A-Z0-9]{8,}\b/);
  oldPayOrder=m?m[0]:'';
  submitClicked=true;
  try{sessionStorage.setItem('bbp_general_v2_submit_'+STORE,JSON.stringify({at:Date.now(),sku:sku,option:option,store:STORE}));}catch(e){}
  clearInterval(wizardTimer);wizardTimer=null;
  payArmed=autoPay;payDone=false;payDeadline=Date.now()+30000;
  message('📨 공식 주문 버튼 1회 클릭 · 새 주문번호 확인 중');
  timingOnce('submit_click','DOM 클릭 호출 · 서버 접수 미확인');ok.click();
  if(payArmed)setTimeout(watchPay,250);
 }
 function watchPay(){
  if(!payArmed||payDone)return;
  if(Date.now()>payDeadline){payArmed=false;message('⚠ 결제창 자동 열기 시간 초과 · 직접 확인');return;}
  const sheet=el('.panel[data-sheet="pay"]');
  if(!sheet||!sheet.isConnected||sheet.hidden||getComputedStyle(sheet).display==='none')return;
  const txt=sheet.textContent||'',m=txt.match(/\bBP[A-Z0-9]{8,}\b/);
  if(!m||m[0]===oldPayOrder||!/주문서를?\s*만들었습니다|주문\s*완료|주문번호/.test(txt))return;
  const pay=sheet.querySelector('[data-act="pay-card"]');
  if(!pay||pay.disabled||!pay.isConnected)return;
  if(/테스트|흉내|결제 끝내기/.test(pay.textContent||'')){payArmed=false;message('⚠ 결제 버튼 확인 필요 · 자동 이동 안 함');return;}
  timingOnce('pay_panel','공식 사이트의 새 주문번호 표시 (번호 미기록)');payDone=true;payArmed=false;message('✅ 새 주문번호 확인 · 페이앱 결제창 열기 시도');revealOfficialStage();timingOnce('pay_click','결제창 이동 버튼 호출');pay.click();
 }
 document.addEventListener('click',e=>{
  if(autoOrder||payDone||!autoPay||payArmed||!completed||!e.isTrusted)return;
  const btn=e.target.closest&&e.target.closest('[data-oc="ok"]');
  if(!btn||btn.disabled||!el('#ocAll')?.checked)return;
  const fs=el('#ocStorage2'),fo=el('#ocOpen2');
  if(fs&&fo&&matchesStorage(fs.textContent)&&fo.textContent.trim()===open){
   const prior=el('.panel[data-sheet="pay"]');
   const m=(prior&&prior.textContent||'').match(/\bBP[A-Z0-9]{8,}\b/);
   oldPayOrder=m?m[0]:'';
   payArmed=true;payDone=false;payDeadline=Date.now()+30000;
   message('✅ 수동 최종 클릭 감지 · 주문번호 확인 후 페이앱 대기');
  }else message('⚠ 옵션 불일치 · 결제창 자동 이동 중지');
 },true);
 const ob=new MutationObserver(()=>{
  if(folded)revealOfficialStage();
  if(cartTimer&&cartProgress)cartProgress();
  if(completed&&el('.oc[role="alertdialog"] .oc-box'))timingOnce('confirm_visible','공식 주문 확인창 DOM 표시');
  if(confirmed&&active&&!polling)handoff();
  if(wizardTimer&&!submitClicked)watchWizard();
  if(payArmed)watchPay();
 });
 ob.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled']});
 document.addEventListener('visibilitychange',()=>{if(timingActive)timingMark(document.hidden?'hidden':'resumed');if(active&&!document.hidden&&!polling){if(timer)clearTimeout(timer);schedule(100);}});
 window.addEventListener('pagehide',()=>{stop();ob.disconnect();mini.remove();});
 controls.opt.value=option;controls.cycle.value=String(cycle);controls.open.value=open;controls.storage.value=storage;controls.manual.value=sku;
 window.__bbpGeneralQuickV23={show,stop,version:'2.3'};
 loadCatalog(false);
}catch(e){alert('범용 v2 도우미 오류: '+String(e.message||e));}
})();