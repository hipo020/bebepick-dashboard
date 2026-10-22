(function(){
'use strict';
try {
 const path=location.pathname, STORE=/^\/plus\/?$/.test(path)?'china':/^\/live\/?$/.test(path)?'main':null;
 if(location.hostname!=='bebepick.me'||!STORE){alert('베베픽 /live 또는 /plus 주문 페이지에서 실행해 줘.');return;}
 if(window.__bbpPreSubmitTestV232){window.__bbpPreSubmitTestV232.show();return;}
 if(window.__bbpPreSubmitTestV231){alert('이전 무주문 진단 v2.3.1이 켜져 있어. 새로고침 후 v2.3.2만 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV23){alert('실주문 v2.3이 켜져 있어. 페이지를 새로고침하고 진단 v2.3.1만 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV2){alert('기존 v2.2.2 도우미가 실행 중이야. 새로고침한 뒤 v2.3 북마크를 실행해 줘.');return;}
 if(window.__bbpGeneralQuickV1||window.__bbpRabbitFast){alert('⚠ 이전 도우미가 열려 있어. 서로 다른 자동화가 충돌하지 않도록 베베픽 페이지를 한 번 새로고침하고 범용 v2 북마크를 실행해 줘.');return;}
 const CART_KEY='bbp_cart_v1',OPTS_KEY='bbp_order_opts',PREF_KEY='bbp_preorder_test_v232_'+STORE;
 const allowed=[5,8,10,15,30,60], labels={single:'낱개 1개',fullbox:'풀박스 1세트'};
 let oldPref={};try{oldPref=JSON.parse(localStorage.getItem('bbp_rabbit_d796_v3')||'{}')||{};}catch(e){}
 let oldGeneral={};try{oldGeneral=JSON.parse(localStorage.getItem('bbp_quick_general_v1_'+STORE)||'{}')||{};}catch(e){}
 let pref={};try{pref=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){}
 let prevV23={};try{prevV23=JSON.parse(localStorage.getItem('bbp_quick_general_v23_'+STORE)||'{}')||{};}catch(e){}
 let prevV231={};try{prevV231=JSON.parse(localStorage.getItem('bbp_preorder_test_v231_'+STORE)||'{}')||{};}catch(e){}
 pref={...oldGeneral,...prevV23,...prevV231,...pref};
 let sku=String(pref.sku||''),option=pref.option==='fullbox'?'fullbox':(oldPref.opt==='fullbox'?'fullbox':'single');
const MAX_LINES=20,MAX_QTY=99,MAX_NAMES=20;
 const nameKey=n=>String(n||'').normalize('NFC').trim().replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
 const validName=n=>typeof n==='string'&&n.trim().length>=2&&n.trim().length<=90&&!/[\u0000-\u001f<>]/.test(n);
 let nameCandidates=[],nameWatchActive=false,lockedCandidate=null,candidateStates=new Map();
 if(Array.isArray(pref.nameCandidates)){
  const seen=new Set();
  for(const c of pref.nameCandidates){
   if(!c||!validName(c.name)||!['single','fullbox'].includes(c.option)||!Number.isInteger(+c.qty)||+c.qty<1||+c.qty>MAX_QTY)continue;
   const key=nameKey(c.name);if(seen.has(key))continue;
   seen.add(key);nameCandidates.push({name:String(c.name).trim(),option:c.option,qty:+c.qty});
   if(nameCandidates.length>=MAX_NAMES)break;
  }
 }
let items=(Array.isArray(pref.items)?pref.items:[]).filter(x=>x&&/^[A-Z0-9-]{2,24}$/.test(String(x.sku||''))&&['single','fullbox'].includes(x.option)&&Number.isInteger(+x.qty)&&+x.qty>=1&&+x.qty<=MAX_QTY).slice(0,MAX_LINES).map(x=>({sku:String(x.sku),option:x.option,qty:+x.qty}));
function chosenItems(){if(nameWatchActive)return lockedCandidate?[{...lockedCandidate.item}]:[];
  return items.length?items.map(x=>({...x})):(validSku(sku)?[{sku,option,qty:1}]:[]);}
function itemKey(x){return x.sku+'|'+x.option;}
function sameItems(a,b){const canon=list=>list.map(x=>itemKey(x)+'|'+Number(x.qty)).sort().join(';;');return a.length===b.length&&canon(a)===canon(b);}
function itemTarget(x){return catalog.find(p=>p&&p.sku===x.sku&&availableHere(p));}
function allSaleable(){return chosenItems().length>0&&chosenItems().every(x=>{const p=itemTarget(x);return p&&saleableFor(p,x);});}
function summaryItems(){return chosenItems().map(x=>{const p=itemTarget(x);return (p?.name||x.sku)+(x.option==='fullbox'?' [풀박스]':' [낱개]')+' ×'+x.qty;}).join(' / ');}
function basketSummary(){if(nameWatchActive&&!lockedCandidate)return '이름 후보 '+nameCandidates.length+'종 · 먼저 판매 가능한 1종 선택';
  const c=chosenItems();return c.length+'줄 · '+c.reduce((n,x)=>n+x.qty,0)+'개 · '+summaryItems();}
 let cycle=allowed.includes(+pref.cycle)?+pref.cycle:(allowed.includes(+oldPref.interval)?+oldPref.interval:8);
 let open=['개봉','미개봉','카드개봉'].includes(pref.open)?pref.open:'개봉';
 let storage=['보관','발송'].includes(pref.storage)?pref.storage:'보관';
 let cartProgress=null,cartPrepared=false,awaitingCatalog=false,autoPay=false,autoOrder=false,dryRun=true,active=false,polling=false,confirmed=false,completed=false,payArmed=false,payDone=false,tries=0,timer=null,controllers=new Set(),catalog=[],lastResults=null,triggerMode='',confirmedAt=0,routeBusy=false,lastRouteAt=0,cartTimer=null,uiTimer=null,lastWindowOk=null,wizardTimer=null,wizardStage=0,wizardStart=0,finalAgreeAt=0,submitClicked=false,payDeadline=0,oldPayOrder='',lastSiteLive=null,lastOfficialDom=null,domWatchTimer=null;

 function el(q,root){return (root||document).querySelector(q);}
 function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({sku,option,cycle,open,storage,items,nameCandidates}));}catch(e){}}
 function readCart(){let c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');if(!Array.isArray(c))throw Error('장바구니 저장 형식이 올바르지 않아');return c;}
 function belongs(c){return (c.store==='china'?'china':'main')===STORE;}
 function normalized(c){return c.opt==='fullbox'?'fullbox':'single';}
 function expected(){const c=readCart().filter(belongs).map(x=>({sku:x.sku,option:normalized(x),qty:Number(x.qty)}));return sameItems(c,chosenItems());}
 function availableHere(p){return p&&(!p.only||p.only===STORE);}
 function target(){return catalog.find(p=>p&&p.sku===sku&&availableHere(p));}
 function allowedOption(p,opt=option){return opt==='single'||!!(p&&p.has_fullbox&&p.pack_size>1);}
 function saleableFor(p,x){if(!p||!availableHere(p)||!allowedOption(p,x.option))return false;
  if(!(p.stock===null||p.stock==='low'))return false;
  if(x.option==='fullbox'&&p.fullbox_out!==false)return false;
  if(p.per_person_max&&x.option==='fullbox'&&Number(p.pack_size)*Number(x.qty)>Number(p.per_person_max))return false;
  if(p.per_person_max&&x.option==='single'&&Number(x.qty)>Number(p.per_person_max))return false;
  return true;
 }
 function saleable(p){return saleableFor(p,{sku,option,qty:1});}
 function label(p){return p?String(p.name||p.sku)+' · '+p.sku:String(sku||'상품 미선택');}
 function money(n){return n!==null&&n!==undefined&&n!==''&&Number.isFinite(+n)?Number(n).toLocaleString('ko-KR')+'원':'가격 로그인 후 확인';}
 const panel=document.createElement('aside');panel.id='bbpPreSubmitTestV232';
 panel.style.cssText='position:fixed;z-index:2147483645;left:10px;right:10px;bottom:10px;max-width:455px;max-height:86dvh;overflow:auto;margin:auto;background:#fff;border:2px solid #8762b8;border-radius:16px;padding:14px 14px 12px;color:#282235;box-shadow:0 8px 32px #0005;font:14px/1.48 system-ui,-apple-system,sans-serif';
 const inputStyle='width:100%;margin-top:3px;min-height:37px;border:1px solid #d8cee5;border-radius:9px;padding:7px;background:#fff;color:#202020;font:inherit';
 const rowStyle='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
 panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>🔍 베베픽 주문 전환 진단 v2.3.2 · 여러 이름 후보 · 주문번호 생성 X</strong><button id="qClose" type="button" style="border:0;background:#fff;font-size:23px;color:#333">×</button></div>'+
 '<div style="font-size:12px;color:#71677d;margin:3px 0" id="qChannel"></div>'+
 '<label style="font-weight:600;display:block;margin-top:9px">인형 이름·상품코드 검색<input id="qSearch" placeholder="예: 밤토끼, D796" autocomplete="off" style="'+inputStyle+'"></label>'+
 '<label style="font-weight:600;display:block;margin-top:7px">선택할 상품 (품절 포함)<select id="qSku" style="'+inputStyle+'"><option value="">상품 목록 불러오는 중…</option></select></label>'+
 '<div style="display:flex;gap:6px;align-items:end;margin-top:6px"><label style="flex:1;font-size:12px">목록에 없는 상품코드로 미리 설정<input id="qManualSku" style="'+inputStyle+'" placeholder="예: D796" maxlength="24" autocapitalize="characters"></label><button id="qUseSku" type="button" style="border:1px solid #cbbadf;background:#f9f6fe;color:#563886;border-radius:9px;padding:9px;white-space:nowrap;font-weight:700">코드 적용</button></div>'+
 '<div id="qProduct" style="font-size:12px;color:#6b5677;margin:7px 0"></div>'+
 '<div style="display:flex;gap:8px;align-items:end;margin:7px 0"><label style="flex:1;font-size:12px">해당 인형 수량<input id="qQty" type="number" min="1" max="99" step="1" value="1" style="'+inputStyle+'"></label><button id="qAdd" type="button" style="border:0;border-radius:9px;background:#704aac;color:#fff;font-weight:700;padding:11px">＋ 인형 추가</button></div>'+
 '<div style="font-size:12px;color:#55446e;margin:6px 0">여러 인형·수량을 추가해. 목록이 비어 있으면 기존처럼 현재 선택한 인형 1개로 진행해.</div>'+
 '<div id="qBasket" style="border:1px solid #e3d8ed;border-radius:10px;padding:7px;font-size:12px"></div>'+
  '<section style="border:1px solid #d6b4fa;background:#faf6ff;border-radius:12px;padding:10px;margin-top:12px">'+
  '<strong>🧸 이름만 아는 미공개 신상 · 여러 후보 대기</strong>'+
  '<div style="font-size:12px;color:#69587c;margin:5px 0">이름 후보가 한 개 이상 있으면 코드 장바구니 모드 대신, 후보 중 처음 판매 가능해진 <b>한 종류만</b> 진단해. 여러 종류가 동시에 확인되면 등록 순서가 우선이야. 이름의 띄어쓰기는 무시하지만 전체 이름이 정확히 같아야 해.</div>'+
  '<label style="display:block;font-size:12px;margin-top:7px">미공개 인형의 정확한 이름<input id="qName" maxlength="90" placeholder="예: 메이메이 서프라이즈" style="'+inputStyle+'"></label>'+
  '<div style="display:flex;align-items:end;gap:6px;margin:7px 0">'+
   '<label style="flex:1;font-size:12px">후보 수량<input id="qNameQty" type="number" min="1" max="99" value="1" style="'+inputStyle+'"></label>'+
   '<button type="button" id="qAddName" style="border:0;border-radius:9px;background:#6847a3;color:white;padding:11px;font-weight:700">＋ 이름 후보 등록</button></div>'+
  '<div id="qNames" style="font-size:12px"></div>'+
  '</section>'+
 '<div style="'+rowStyle+'"><label style="flex:1;min-width:123px">구매 단위<select id="qOpt" style="'+inputStyle+'"><option value="single">낱개 1개</option><option value="fullbox">풀박스 1세트</option></select></label><label style="flex:1;min-width:115px">서버 확인 주기<select id="qCycle" style="'+inputStyle+'"><option value="5">5초 (요청 많음)</option><option value="8">8초 (기본)</option><option value="10">10초</option><option value="15">15초</option><option value="30">30초</option><option value="60">60초</option></select></label></div>'+
 '<div style="'+rowStyle+'"><label style="flex:1;min-width:125px">개봉 옵션<select id="qOpen" style="'+inputStyle+'"><option value="개봉">개봉</option><option value="미개봉">미개봉</option><option value="카드개봉">카드개봉</option></select></label><label style="flex:1;min-width:120px">받는 방법<select id="qStorage" style="'+inputStyle+'"><option value="보관">보관</option><option value="발송">바로 배송</option></select></label></div>'+
 '<div style="background:#f6f0ff;padding:10px;border-radius:10px;margin:9px 0">'+
  '<strong>🧪 주문 생성 없는 전환 진단 전용</strong>'+
  '<small style="color:#514163;display:block;margin-top:5px">주문 OFF에서 대기 → 실제 주문 ON 감지 → 등록한 이름 후보 중 판매 가능한 한 종류만 자동 연결 → 장바구니와 최종 확인창까지 이동.</small>'+
  '<small style="color:#6c4b46;display:block;margin-top:5px">최종 주문 확정 버튼은 자동으로 절대 누르지 않아. 주문번호·3분 결제창 생성 없음. 단, 공식 장바구니 구성과 옵션은 변경할 수 있어.</small></div>'+
 '<div id="qStatus" role="status" style="font-weight:700;padding:8px 9px;background:#f5effc;border-radius:8px;margin:9px 0">📦 상품 목록을 불러오는 중…</div>'+
 '<div style="display:flex;gap:7px;margin-top:8px"><button id="qStart" type="button" style="flex:1;border:0;border-radius:10px;padding:11px;background:#6b4aac;color:#fff;font-weight:700">🔎 OFF → ON 감지 테스트 시작</button><button id="qStop" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">중지</button><button id="qLoad" type="button" style="border:1px solid #cbbadf;border-radius:10px;background:#fff;padding:10px">목록 갱신</button></div>'+
 '<button id="qReload" type="button" hidden style="display:none;width:100%;margin-top:8px;border:0;border-radius:9px;background:#332340;color:#fff;padding:11px;font-weight:700">🛒 판매 가능 확인 · 공식 화면 새로고침</button>'+
 '<details id="qTiming" style="margin:9px 0;padding:10px;border:1px solid #d7c4e7;background:#faf7ff;border-radius:10px"><summary style="cursor:pointer;font-weight:750">⏱️ 자동주문 구간별 속도 기록 (로컬 저장)</summary>'+
 '<div id="qTimingSummary" style="margin:6px 0;font-size:12px;color:#4c376a">대기 시작 후 기록이 표시돼.</div>'+
 '<pre id="qTimingLog" style="white-space:pre-wrap;word-break:break-word;max-height:176px;overflow:auto;font:11px/1.5 ui-monospace,monospace;color:#3e3452">아직 기록이 없어.</pre>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="qTimingCopy" style="border:1px solid #c2afd6;background:#fff;padding:8px;border-radius:7px">📋 기록 복사</button><button type="button" id="qTimingDownload" style="border:1px solid #c2afd6;background:#fff;padding:8px;border-radius:7px">💾 JSON 저장</button></div>'+
 '<small style="display:block;color:#756b80;margin-top:7px">자동 측정 · 0.1ms 정밀도 기록 · 세션 내 저장. 실제 재입고 시각은 알 수 없으므로 최초 판매 가능 응답부터 측정해. 주문 성공과 서버 접수를 의미하지 않아.</small></details>'+
 '<small style="display:block;color:#766d7f;margin-top:9px">품절이어도 설정하고 대기할 수 있어. 품절 또는 목록에 없는 코드일 때는 재고가 공식 서버에서 확인될 때까지 주문이나 장바구니 변경 없이 기다려. 주문 접수 OFF 동안 감시하고, 실제 주문 ON과 선택된 상품의 재고 및 공식 버튼 활성화를 확인해. 홈페이지 LIVE ON만으로 진행하지 않아. 최종 주문 확정·3분 결제 타이머는 생성하지 않으며, 테스트 중 같은 몰 장바구니는 변경할 수 있어. 5초 감시는 요청 제한 위험이 있어.</small>';
 document.body.appendChild(panel);
 const controls={search:el('#qSearch',panel),manual:el('#qManualSku',panel),sku:el('#qSku',panel),opt:el('#qOpt',panel),cycle:el('#qCycle',panel),open:el('#qOpen',panel),storage:el('#qStorage',panel),pay:null,qty:el('#qQty',panel),add:el('#qAdd',panel),basket:el('#qBasket',panel),name:el('#qName',panel),nameQty:el('#qNameQty',panel),addName:el('#qAddName',panel),names:el('#qNames',panel),status:el('#qStatus',panel),product:el('#qProduct',panel),reload:el('#qReload',panel),
 timingSummary:el('#qTimingSummary',panel),timingLog:el('#qTimingLog',panel)};
 // Instrumentation only. No extra site requests, no order submission,
 // no recording of auth cookies, customer details, or generated order numbers.
 const TIMING_KEY='bbp_presubmit_v232_timing_last_'+STORE;
 const TIMING_LABELS={
  started:'대기 시작', initial_cart:'시작 전 장바구니 준비', first_poll:'첫 서버 조회 시작',
  poll_sample:'서버 조회 구간 표본', poll_error:'서버 조회 문제',
  sellable:'공식 상품 RPC 판매 가능 최초 확인', window_open:'주문 접수/LIVE 상태 확인',
  cart_ready:'장바구니·선택 옵션 준비', both_ready:'재고+접수 조건 모두 확인',
  official_ui_wait:'공식 주문 화면 반영 대기', route_refresh:'공식 화면 내부 경로 갱신',
  window_closed:'공식 주문 접수 닫힘 관측', window_transition:'주문 접수 닫힘→열림 관측', ui_stale:'공식 화면 미갱신',
  official_ui_ready:'공식 화면 주문 버튼 활성 확인', cart_click:'장바구니 열기 클릭 호출',
  cart_panel:'공식 장바구니 패널 표시', option_ok:'개봉/보관 옵션 확인',
  checkout_click:'주문 확인창 열기 클릭 호출', confirm_visible:'주문 확인창 표시',
  agree_step1:'1단계 확인/계속 클릭 호출', final_visible:'최종 주문 확인 단계 표시',
  dry_run_stop:'무전송 시험 · 최종 주문 클릭 생략',
  pre_submit_ready:'✅ 최종 주문 확인창 도달 · 실제 주문 0건',
  candidate_state:'미공개 이름 후보 상태 변화',candidate_selected:'이름 후보 공식 SKU 자동 연결',
  order_state:'서버 주문 접수 상태 관찰', site_live_marker:'홈페이지 방송 표시 변화',
  official_dom_state:'공식 화면 주문 표시/버튼 관찰',
  stopped:'감시 중지', hidden:'브라우저 백그라운드 전환', resumed:'브라우저 다시 표시',
  safety_stop:'안전장치로 자동 단계 중지'
 };
 let timingActive=false,timingEvents=[],timingOnceKeys=new Set(),timingStartPerf=0,timingSaleablePerf=null,
  timingStartedAt=null,timingMode='',timingSku='',timingCycle=8,timingPersistTimer=null;
 let timingStats={checks:0,errors:0,lastRoundMs:null,minRoundMs:null,maxRoundMs:null,rpc:{}};
 const ms=n=>Math.round(n*10)/10;
 function timingReport(){
  return {kind:'bebepick-pre-submit-name-candidates-diagnostic',version:'2.3.2',createdAt:new Date().toISOString(),
   store:STORE,sku:lockedCandidate?.item.sku||timingSku,items:chosenItems(),nameCandidates:nameCandidates.map(c=>({...c})),selectedCandidate:lockedCandidate?{name:lockedCandidate.name,sku:lockedCandidate.item.sku}:null,option:option,intervalSeconds:timingCycle,mode:timingMode,
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
  timingStartedAt=new Date().toISOString();timingSku=chosenItems().map(x=>x.sku).join(',');timingCycle=cycle;
  timingMode=nameWatchActive?'이름 후보 '+nameCandidates.length+'종 중 첫 판매 가능 1종 · 주문 확정 직전 정지':'OFF→ON 실측 · 최종 주문 클릭 없이 확인창에서 정지';
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
  if(last&&last.kind==='bebepick-pre-submit-transition-diagnostic'&&last.store===STORE&&Array.isArray(last.events)){
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
 mini.id='bbpPreSubmitV232Mini';mini.hidden=true;mini.type='button';
 mini.style.cssText='position:fixed;z-index:2147483646;right:9px;top:90px;max-width:225px;background:#704aac;color:#fff;border:0;border-radius:999px;padding:8px 10px;box-shadow:0 4px 16px #0004;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
 mini.textContent='🧪 주문 전환 진단 중 · 펼치기';
 document.body.append(mini);
 let folded=false,lastScrollStage='',lastUiNotice=0;
 mini.onclick=()=>{folded=false;mini.hidden=true;panel.style.display='block';};
 function message(t){if(controls.status.textContent!==t)controls.status.textContent=t;}
 function show(){folded=false;mini.hidden=true;panel.style.display='block';}
 function foldOfficial(){
  if(folded)return;
  folded=true;panel.style.display='none';mini.hidden=false;
  revealOfficial();
 }
 function revealOfficial(){
  if(!folded||document.hidden)return;
  let target=null,stage='';
  const confirm=el('.oc[role="alertdialog"] .oc-box');
  if(confirm&&confirm.isConnected){
   target=confirm.querySelector('[data-oc="ok"]')||confirm.querySelector('[data-oc="next"]')||confirm;
   stage=confirm.querySelector('[data-oc="ok"]')?'final-confirm':'first-confirm';
  }else{
   const pay=el('.panel[data-sheet="pay"]'),cart=el('.panel[data-sheet="cart"]');
   if(pay&&pay.isConnected&&!pay.hidden&&getComputedStyle(pay).display!=='none'){
    target=pay.querySelector('[data-act="pay-card"]')||pay;stage='pay';
   }else if(cart&&cart.isConnected&&!cart.hidden&&getComputedStyle(cart).display!=='none'){
    target=cart.querySelector('#checkout')||cart;stage='cart';
   }
  }
  if(!target||lastScrollStage===stage)return;
  lastScrollStage=stage;
  requestAnimationFrame(()=>{try{if(target.isConnected)target.scrollIntoView({block:'end',inline:'nearest',behavior:'auto'});}catch(e){}});
 }
 function stop(){if(domWatchTimer)clearInterval(domWatchTimer);domWatchTimer=null;if(uiTimer)clearInterval(uiTimer);uiTimer=null;timingStop('감시 또는 안전장치 중지');active=false;confirmed=false;if(timer)clearTimeout(timer);timer=null;
   if(cartTimer)clearInterval(cartTimer);cartTimer=null;cartProgress=null;
   if(wizardTimer)clearInterval(wizardTimer);wizardTimer=null;
   controllers.forEach(c=>c.abort());controllers.clear();polling=false;payArmed=false;autoOrder=false;
  }
  function endPolling(){if(uiTimer)clearInterval(uiTimer);uiTimer=null;active=false;if(timer)clearTimeout(timer);timer=null;controllers.forEach(c=>c.abort());controllers.clear();polling=false;}
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
 function renderBasket(){
  const list=items.length?items:[];
  controls.basket.replaceChildren();
  const head=document.createElement('div');head.style.cssText='font-weight:750;margin-bottom:6px';
  head.textContent=list.length?'🧸 선택된 인형 '+list.length+'줄 · 총 '+list.reduce((n,x)=>n+x.qty,0)+'개':'선택 목록 없음 · 현재 선택 상품 1개로 진행';
  controls.basket.appendChild(head);
  list.forEach((x,i)=>{
    const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:5px 0;border-top:1px solid #f0eaf5';
    const name=document.createElement('span');name.style.cssText='flex:1;min-width:110px;overflow-wrap:anywhere';
    const p=itemTarget(x);name.textContent=(p?.name||x.sku)+' · '+(x.option==='fullbox'?'풀박스':'낱개')+' ×'+x.qty;
    r.append(name);
    for(const [cmd,txt] of [['less','−'],['more','＋'],['remove','삭제']]){
      const b=document.createElement('button');b.type='button';b.textContent=txt;b.dataset.itemAction=cmd;b.dataset.itemIndex=String(i);
      b.style.cssText='border:1px solid #d4c8e0;border-radius:6px;background:#fff;padding:4px 7px';r.append(b);
    }
    controls.basket.append(r);
  });
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
  controls.sku.value=inCatalog||ghost?sku:'';renderBasket();
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
  renderBasket();return valid;
 }
 async function loadCatalog(silent){if(!silent)message('📦 공식 상품 목록 확인 중…');
  try{const p=await rpc('list_products',{p_brand:STORE});if(!Array.isArray(p))throw Error('상품 응답 형식이 예상과 다름');catalog=p;fillCatalog();updateInfo();
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
  const list=chosenItems();
  if(!list.length){message('⚠ 상품을 먼저 선택해 줘');return false;}
  for(const x of list){
   const p=itemTarget(x);
   if(!p||!availableHere(p)||!allowedOption(p,x.option)||!saleableFor(p,x)){message('⚠ '+x.sku+' 재고/옵션/1인 구매 한도 확인 필요');return false;}
  }
  let c;try{c=readCart();}catch(e){message('⚠ 장바구니 읽기 오류');return false;}
  const sameStore=c.filter(belongs),cur=sameStore.map(x=>({sku:x.sku,option:normalized(x),qty:Number(x.qty)}));
  if(sameItems(cur,list))return prefill();
  if(sameStore.length){
   const yes=confirm('현재 '+(STORE==='main'?'베베픽':'베플+')+' 장바구니 '+sameStore.length+'줄을 선택한 '+list.length+'줄로 교체할까?\n\n'+summaryItems()+'\n\n기존 장바구니는 이 몰에 한해 교체돼.');
   if(!yes)return false;
  }
  const preserved=c.filter(x=>!belongs(x));
  const added=list.map((x,i)=>({sku:x.sku,opt:x.option,qty:x.qty,store:STORE,lid:Date.now().toString(36)+Math.random().toString(36).slice(2,8)+'-'+i}));
  try{localStorage.setItem(CART_KEY,JSON.stringify(preserved.concat(added)));window.dispatchEvent(new StorageEvent('storage',{key:CART_KEY}));}
  catch(e){message('⚠ 장바구니 저장 실패');return false;}
  if(!expected()){message('⚠ 저장된 장바구니 구성이 맞지 않아');return false;}
  return prefill();
 }
 function prefill(){try{let v={};try{v=JSON.parse(sessionStorage.getItem(OPTS_KEY)||'{}')||{};}catch(e){}
  v.open=open;v.storage=storage;v.use_credit=0;v.use_prize=0;v.use_free_ship=false;v.use_priority=false;v.store=STORE;sessionStorage.setItem(OPTS_KEY,JSON.stringify(v));return true;
 }catch(e){message('⚠ 개봉·보관 옵션을 미리 저장하지 못했어');return false;}}
 function serverOpen(w){return !!(w&&w.reason!=='paused'&&w.open===true&&w.enabled!==false&&w.closed!==true);}
  function openMode(w){return serverOpen(w)?'주문 접수':'';}
  function matchesStorage(value){const v=String(value||'').trim();return storage==='발송'?(v==='발송'||v==='바로 배송'):(v==='보관');}
 function latestAvailability(p){return allSaleable()?'선택한 상품 모두 판매 가능':p?'일부 상품 품절/재고 부족':'목록 대기';}
 function checkOfficialDom(){
  if(!timingActive)return;
  const bar=el('#storeBar .sb-order');
  const cart=el('#cartBar .cb-submit')||el('#btnTopCart:not([hidden])');
  const state=(bar?(bar.classList.contains('open')?'ON':'OFF'):'not-found')+
   ' · cart-opener='+(cart?(cart.disabled?'disabled':'enabled'):'not-found');
  if(lastOfficialDom===state)return;
  lastOfficialDom=state;timingMark('official_dom_state',state);
 }
 function schedule(delay){if(timer)clearTimeout(timer);if(active&&!confirmed)timer=setTimeout(poll,delay);}
 async function poll(){
  if(!active||polling||confirmed)return;
  if(document.hidden){message('📱 브라우저를 다시 열면 감시 재개');schedule(cycle*1000);return;}
  if(cartPrepared&&!expected()){stop();message('⚠ 장바구니 상품·옵션·수량이 바뀌어 감시 중지');return;}
  polling=true;
  const pollStartedAt=performance.now();timingOnce('first_poll');
  try{const res=await Promise.allSettled([rpc('order_windows',{}),rpc('list_products',{p_brand:STORE})]);
   timingRound(performance.now()-pollStartedAt,res.some(x=>x.status==='rejected'));
   if(!active)return;
   let windowOk=null,productOk=null,failed=[],p=null;
   if(res[0].status==='fulfilled'){const w=res[0].value&&res[0].value[STORE];if(w&&(typeof w.open==='boolean'||typeof w.yt_live==='boolean')){
     windowOk=serverOpen(w);triggerMode=openMode(w);
     if(typeof w.yt_live==='boolean'&&lastSiteLive!==w.yt_live){
      timingMark('site_live_marker',(lastSiteLive===null?'첫 관측: ':'표시 변화: ')+(w.yt_live?'LIVE ON':'LIVE OFF')+' · 주문 접수는 별개');
      lastSiteLive=w.yt_live;
     }
     if(lastWindowOk!==windowOk){
      timingMark('order_state',(lastWindowOk===null?'첫 관측: ':'상태 변화: ')+(windowOk?'주문 접수 ON':'주문 접수 OFF')+' · open='+String(w.open)+' enabled='+String(w.enabled)+' closed='+String(w.closed));
     }
     if(windowOk){timingOnce('window_open',triggerMode);if(lastWindowOk===false)timingOnce('window_transition','공식 주문 상태 닫힘 → '+triggerMode);}else if(lastWindowOk===null)timingOnce('window_closed','공식 주문 상태 닫힘');lastWindowOk=windowOk;}else failed.push(new Error('주문 응답 형식 오류'));}
   else failed.push(res[0].reason);
   if(res[1].status==='fulfilled'&&Array.isArray(res[1].value)){
   catalog=res[1].value;
   const chosen=chosenItems(),targets=chosen.map(itemTarget);
   p=targets.find(x=>x)||null;
   const missing=targets.some(x=>!x);
   awaitingCatalog=missing;
   if(chosen.length===0){productOk=false;}
   else if(missing){productOk=false;}
   else if(targets.every(x=>Object.prototype.hasOwnProperty.call(x,'stock'))){
    if(!chosen.every((x,i)=>allowedOption(targets[i],x.option))){stop();message('⚠ 선택한 상품 중 지원하지 않는 옵션이 있어 · 수동 확인');return;}
    if(allSaleable())timingOnce('sellable','선택한 모든 인형의 판매 가능 상태 확인');
    // Never mutate cart while any item is out of stock.
    if(!cartPrepared&&windowOk===true&&allSaleable()){
     if(!await prepare()){stop();message('⚠ 전체 상품 판매 가능 확인 후 장바구니 준비 실패 · 수동 확인');return;}
     cartPrepared=true;timingOnce('cart_ready','전체 상품 재고 확인 후');fillCatalog();updateInfo();
    }
    productOk=!!cartPrepared&&allSaleable();
   }else failed.push(new Error('선택 상품 재고 응답 형식 오류'));
  }
   else failed.push(res[1].status==='rejected'?res[1].reason:new Error('재고 응답 형식 오류'));
   const when=new Date().toLocaleTimeString('ko-KR',{hour12:false});
   const nowStatus='📡 구매 조건 '+(windowOk===null?'조회 실패':windowOk?(triggerMode||'충족'):'미충족')+' · '+chosenItems().length+'줄 '+(productOk===null?'재고 조회 실패':awaitingCatalog?'⏳ 공식 목록 재등장 대기':latestAvailability(p))+' · '+when;
   if(failed.length){
    tries++;
    if(failed.some(e=>e&&[401,403].includes(e.httpStatus))){stop();message('⚠ 서버 조회 거절 · 감시 중지');return;}
    const delayed=failed.some(e=>e&&e.httpStatus===429)?60000:Math.min(120000,cycle*1000*Math.pow(2,Math.min(tries,4)));
    message(nowStatus+' · '+Math.round(delayed/1000)+'초 후 재확인');schedule(delayed);return;
   }
   tries=0;
   if(windowOk&&productOk){
    confirmed=true;confirmedAt=Date.now();
    timingOnce('both_ready','재고+접수 조건 충족');
    message('✅ '+triggerMode+' + 선택 상품 재고 표시 · 공식 주문 UI 확인 중');
    // The official page may not mutate its DOM until AFTER the server
    // turns ON. Recheck its own UI at bounded intervals, with no new RPC.
    if(!uiTimer)uiTimer=setInterval(()=>{if(confirmed&&active&&!polling&&!document.hidden)handoff();},250);
    handoff();return;
   }
   message(nowStatus);schedule(cycle*1000);
  }catch(e){tries++;timingMark('poll_error','조회 처리 오류');message('⚠ 감시 오류 · 잠시 뒤 다시 시도');schedule(Math.min(120000,cycle*2000*Math.pow(2,Math.min(tries,4))));}
  finally{polling=false;}
 }
 function reloadShow(){
  timingOnce('official_ui_wait','공식 DOM 주문상태 반영 대기');
  controls.reload.style.display='block';controls.reload.hidden=false;
  if(Date.now()-lastUiNotice>1200){
   lastUiNotice=Date.now();
   message('🔄 서버에서는 주문 가능 · 공식 홈페이지의 닫힌 화면 갱신 대기 (최대 5초)');
  }
  if(!routeBusy&&Date.now()-lastRouteAt>5500)refreshRoute();
 }
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
    setTimeout(()=>{routeBusy=false;if(active&&confirmed)handoff();},1200);
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
 function staleOfficialUi(reason){
  if(Date.now()-confirmedAt<5000){reloadShow();return;}
  timingMark('ui_stale',reason+' · 서버 구매 가능 확인 후 5초');
  if(uiTimer)clearInterval(uiTimer);uiTimer=null;
  confirmed=false;
  controls.reload.hidden=false;controls.reload.style.display='block';
  message('⚠ 서버에는 구매 가능 상태지만 공식 화면이 갱신되지 않았어 ('+reason+'). 감시는 계속해. 새로고침할 때는 북마크를 다시 실행해야 해.');
  schedule(cycle*1000);
 }
 function handoff(){
  if(!confirmed||!active)return;
  if(!expected()){stop();message('⚠ 장바구니 내용 변경 · 주문 진행 중지');return;}
  const w=el('#storeBar .sb-order.open');
  const shopFresh=chosenItems().every(x=>{
   const pcard=el('[data-ctl="'+x.sku+'"]'),card=pcard&&pcard.closest('.prod');
   return card&&!card.classList.contains('soldout')&&(x.option==='single'||!card.classList.contains('fbout'));
  });
  if(!w||!shopFresh){staleOfficialUi('공식 판매 화면 갱신 지연');return;}
  const btn=el('#cartBar .cb-submit')||el('#btnTopCart:not([hidden])');
  if(!btn||btn.disabled){staleOfficialUi('공식 주문 버튼 비활성');return;}
  if(Date.now()-confirmedAt>Math.max(10000,cycle*2000)){confirmed=false;message('🔄 구매 직전 공식 서버 재확인');poll();return;}
  timingOnce('official_ui_ready','공식 주문 버튼 활성화');endPolling();completed=true;message('✅ 공식 장바구니·주문창 여는 중…');
  timingOnce('cart_click','버튼 호출 · 주문 생성 아님');btn.click();
  foldOfficial();
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
   wizardStage=0;wizardStart=Date.now();wizardTimer=setInterval(watchWizard,50);
   timingOnce('checkout_click','버튼 호출 · 주문 생성 아님');next.click();
   message('📋 공식 확인창 자동 진행 중 · 최종 주문 확정 버튼은 누르지 않아');
  };
  cartProgress=progressCart;
  cartTimer=setInterval(progressCart,50);
  queueMicrotask(progressCart);
 }
 controls.add.onclick=()=>{
  if(active||completed){message('⚠ 먼저 감시를 중지하거나 새로고침해 줘');return;}
  const code=(controls.sku.value||controls.manual.value||sku).trim().toUpperCase();
  const qty=Number(controls.qty.value),opt=controls.opt.value==='fullbox'?'fullbox':'single',p=catalog.find(x=>x.sku===code&&availableHere(x));
  if(!validSku(code)||!Number.isInteger(qty)||qty<1||qty>MAX_QTY){message('⚠ 상품코드 또는 수량(1~99)을 확인해 줘');return;}
  if(p&&!allowedOption(p,opt)){message('⚠ 해당 상품은 풀박스를 지원하지 않아');return;}
  if(p&&p.per_person_max&&qty*(opt==='fullbox'?Number(p.pack_size):1)>Number(p.per_person_max)){message('⚠ 1인 구매 수량 제한 초과');return;}
  const key=code+'|'+opt,i=items.findIndex(x=>itemKey(x)===key);
  if(i>=0){
   if(items[i].qty+qty>MAX_QTY){message('⚠ 같은 상품 수량 최대 99개');return;}
   items[i].qty+=qty;
  }else{
   if(items.length>=MAX_LINES){message('⚠ 한 번에 최대 '+MAX_LINES+'줄');return;}
   items.push({sku:code,option:opt,qty});
  }
  sku=code;option=opt;savePref();renderBasket();message('✅ 인형 '+items.length+'줄 · '+items.reduce((n,x)=>n+x.qty,0)+'개 선택');
 };
 controls.basket.addEventListener('click',e=>{
  const btn=e.target.closest('[data-item-action]');if(!btn||active||completed)return;
  const i=Number(btn.dataset.itemIndex),x=items[i];if(!x)return;
  const mode=btn.dataset.itemAction;
  if(mode==='remove')items.splice(i,1);
  else if(mode==='less'){if(x.qty===1)items.splice(i,1);else x.qty--;}
  else if(mode==='more'){
   const p=itemTarget(x);
   if(x.qty>=MAX_QTY||p&&p.per_person_max&&(x.qty+1)*(x.option==='fullbox'?Number(p.pack_size):1)>Number(p.per_person_max)){message('⚠ 수량 한도 확인 필요');return;}
   x.qty++;
  }
  savePref();renderBasket();message('🧸 선택 목록 갱신됨');
 });
 controls.reload.onclick=()=>{
   if(!expected()){message('⚠ 장바구니 내용을 확인해 줘');return;}
   if(!confirm('공식 홈페이지를 새로고침할까? 진행 중인 도우미는 종료돼. 새로고침 뒤 북마크를 다시 실행해야 해.'))return;
   location.assign(STORE==='main'?'https://bebepick.me/live':'https://bebepick.me/plus');
  };
 el('#qStart',panel).onclick=async()=>{
  if(completed){message('⚠ 한 번 진단한 뒤에는 새로고침하고 다시 시작해 줘');return;}
  if(active){message('⏳ 이미 감시 중이야');return;}
  if(!catalog.length)await loadCatalog(false);
  const selected=controls.sku.value;
  if(!items.length){
   if(!selected&&!validSku(sku)){message('⚠ 구매할 인형을 먼저 선택해 줘');return;}
   sku=selected||sku;option=controls.opt.value==='fullbox'?'fullbox':'single';
  }
  const chosen=chosenItems();if(!chosen.length){message('⚠ 구매할 상품을 추가해 줘');return;}
  cycle=allowed.includes(+controls.cycle.value)?+controls.cycle.value:8;
  open=controls.open.value;storage=controls.storage.value;savePref();
  if(chosen.some(x=>!validSku(x.sku)||x.qty<1||x.qty>MAX_QTY||itemTarget(x)&&!allowedOption(itemTarget(x),x.option))){message('⚠ 상품코드·수량·풀박스 지원 여부를 확인해 줘');return;}
  // Diagnostic only: no real order mode.
  autoOrder=true;dryRun=true;autoPay=false;
  timingStart();
  // Do not write cart while server order intake is OFF.
  cartPrepared=false;awaitingCatalog=chosenItems().some(x=>!itemTarget(x));
  autoOrder=true;dryRun=true;autoPay=false;
  active=true;confirmed=false;completed=false;tries=0;triggerMode='';routeBusy=false;lastWindowOk=null;lastSiteLive=null;lastOfficialDom=null;
  if(domWatchTimer)clearInterval(domWatchTimer);domWatchTimer=setInterval(checkOfficialDom,250);checkOfficialDom();
  controls.reload.hidden=true;controls.reload.style.display='none';
  message('🔎 OFF → ON 감시 시작 · '+basketSummary()+' · '+open+' + '+storage+' · 서버 확인 '+cycle+'초 · 최종 주문 확정 클릭 없음');
  poll();
 };
 el('#qStop',panel).onclick=()=>{stop();message('⏸ 주문 생성 없이 감시 중지');};
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
  if(!wizardTimer)return;
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
  // Physical safety boundary: NEVER press final submit or modify #ocAll.
  if(wizardTimer)clearInterval(wizardTimer);wizardTimer=null;
  autoOrder=false;
  timingMark('pre_submit_ready','공식 2단계 최종 확인창 도달 · 주문 확정 클릭 0회');
  mini.textContent='✅ 최종 확인창 도착 · 주문 생성 0회';
  message('✅ 최종 확인창까지 자동 도착 · 주문번호와 3분 결제 화면은 생성하지 않았어');
  if(domWatchTimer)clearInterval(domWatchTimer);domWatchTimer=null;
  timingStop('최종 주문 확정 직전 진단 성공 · 클릭 0회');
 }
 const ob=new MutationObserver(records=>{
  // Own floating panel status/trace mutations must NOT cause reentrant
  // handoff checks or stale-refresh loops.
  if(!records.some(r=>!panel.contains(r.target)&&!mini.contains(r.target)&&r.target!==panel&&r.target!==mini))return;
  if(folded)revealOfficial();
  if(cartTimer&&cartProgress)cartProgress();
  if(completed&&el('.oc[role="alertdialog"] .oc-box'))timingOnce('confirm_visible','공식 주문 확인창 DOM 표시');
  if(confirmed&&active&&!polling)handoff();
  if(wizardTimer)watchWizard();
 });
 ob.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled']});
 document.addEventListener('visibilitychange',()=>{if(timingActive)timingMark(document.hidden?'hidden':'resumed');if(active&&!document.hidden&&!polling){if(timer)clearTimeout(timer);schedule(100);}});
 window.addEventListener('pagehide',()=>{stop();ob.disconnect();mini.remove();});
 controls.opt.value=option;controls.cycle.value=String(cycle);controls.open.value=open;controls.storage.value=storage;controls.manual.value=sku;
 window.__bbpPreSubmitTestV232={show,stop,version:'2.3.2'};
 renderBasket();loadCatalog(false);
}catch(e){alert('범용 v2 도우미 오류: '+String(e.message||e));}
})();