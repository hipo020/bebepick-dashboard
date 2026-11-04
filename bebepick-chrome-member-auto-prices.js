/* 베베픽 회원 가격 자동 확인 v1.0 · Chrome bookmarklet (read-only)
   Runs ONLY on official bebepick.me pages under the member's session.
   30s manual opt-in watch while the tab is alive; never uploads credentials,
   tokens, orders, or price data to a server. Transfers only sanitized prices
   directly to an optionally opened stock-board TAB through postMessage.
*/
(async function(){
'use strict';
const TAG='__bbpMemberPricesAutoV1';
if(location.origin!=='https://bebepick.me'||!/^\/(?:live|plus|gap)(?:\/|$)/.test(location.pathname)){
 alert('로그인한 베베픽 공식 /live 또는 /plus 화면에서 실행해 줘.');return;
}
if(window[TAG]){window[TAG].show();return;}
const app=window.APP_CONFIG;
if(!app||app.mode!=='live'||!window.supabase?.createClient||
   new URL(String(app.supabaseUrl||''),'https://invalid.test').origin!=='https://eqytdtxemjlygnobhiio.supabase.co'||
   !app.supabaseAnonKey){
 alert('베베픽 페이지가 다 열린 뒤 다시 실행해 줘.');return;
}
const BRAND=/^\/plus(?:\/|$)/.test(location.pathname)?'china':
  /^\/gap(?:\/|$)/.test(location.pathname)?'gap':'main';
const DASH='https://hipo020.github.io';
const DASH_URL=DASH+'/bebepick-dashboard/?member-price-sync=1';
const PERIOD=30000;
let timer=null,stopped=false,busy=false,dash=null,lastRows=[],lastAt=null,lastKey='',changeCount=0,errors=0;
const root=document.createElement('aside');
root.id='bbp-member-prices-auto';
root.style.cssText='position:fixed;z-index:2147483647;top:10px;left:10px;right:10px;max-width:610px;margin:auto;max-height:82dvh;overflow:auto;box-sizing:border-box;background:#17212d;color:#f5f8fc;border:2px solid #82d8bb;border-radius:14px;padding:14px;box-shadow:0 15px 36px #000b;font:13px/1.5 system-ui,sans-serif';
const heading=document.createElement('div');
heading.style.cssText='font-size:16px;font-weight:800;margin:0 0 6px';
heading.textContent='🧸 베베픽 회원 가격 자동 확인';
const info=document.createElement('div');
info.style.cssText='color:#c2ced9;margin-bottom:8px;font-size:12px';
info.textContent='로그인된 이 크롬 탭에서 30초마다 공식 상품 정보만 조회해. 주문·결제 없음.';
const status=document.createElement('div');
status.style.cssText='padding:9px 10px;border-radius:9px;background:#273748;color:#a9e7d1;font-weight:750;white-space:pre-wrap';
status.textContent='회원 로그인 확인 중…';
const actions=document.createElement('div');
actions.style.cssText='display:flex;flex-wrap:wrap;gap:7px;margin:10px 0';
const detail=document.createElement('div');
detail.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:33dvh;overflow:auto;border-top:1px solid #3b4b5f;padding-top:8px;font:12px/1.6 system-ui,sans-serif';
const notice=document.createElement('div');
notice.style.cssText='font-size:11px;color:#afbed0;margin-top:8px';
notice.textContent='🔒 로그인 토큰·비밀번호·주문·회원정보는 다른 사이트로 보내지 않아. 재고판에는 상품코드/가격만 탭 간 전달해. 브라우저를 닫으면 종료돼.';
const makeButton=(text,fn,primary=false)=>{
 const button=document.createElement('button');button.textContent=text;
 button.style.cssText='border:0;border-radius:9px;padding:9px 11px;min-height:36px;background:'+(primary?'#82d8bb':'#35475d')+';color:'+(primary?'#10251d':'#f2f6fc')+';font:750 12px system-ui;cursor:pointer';
 button.onclick=fn;actions.appendChild(button);return button;
};
const show=()=>{root.style.display='block';};
const stop=()=>{stopped=true;clearInterval(timer);timer=null;
 status.textContent='⏹ 자동 가격 확인 중지됨 · 다시 실행하면 새로 시작해.';};
const post=()=>{
 if(!dash||dash.closed||!lastAt||!lastRows.length)return false;
 try{
  dash.postMessage({
   type:'bbp-member-price-snapshot-v1',version:1,brand:BRAND,observed_at:lastAt,
   products:lastRows.map(p=>({sku:p.sku,name:p.name,price:p.price,fullbox_price:p.fullbox_price}))
  },DASH);
  return true;
 }catch{return false;}
};
window.addEventListener('message',ev=>{
 if(ev.origin===DASH&&ev.source===dash&&ev.data?.type==='bbp-member-price-ready-v1')post();
});
makeButton('📊 재고판 연결',()=>{
 dash=window.open(DASH_URL,'bbp-member-price-board');
 if(!dash){status.textContent='⚠ 팝업이 차단됐어. 크롬 팝업 허용 후 다시 연결해 줘.';return;}
 try{dash.focus();}catch{}
 // A ready handshake is authoritative. These retries only cover early load timing.
 setTimeout(post,900);setTimeout(post,2500);
},true);
makeButton('↻ 지금 조회',()=>void poll());
makeButton('📋 가격 복사',async()=>{
 const txt='베베픽 회원 가격 · '+(lastAt||'미조회')+'\n'+lastRows.map(p=>
  p.sku+' '+p.name+' | '+(p.price===null?'가격 미제공':p.price.toLocaleString('ko-KR')+'원')+
  ' | 풀박스 '+(p.fullbox_price===null?'미제공':p.fullbox_price.toLocaleString('ko-KR')+'원')).join('\n');
 try{await navigator.clipboard.writeText(txt);status.textContent='📋 회원 가격만 복사했어 · 토큰은 포함하지 않았어.';}
 catch{status.textContent='클립보드 복사 불가. 화면 캡처를 이용해 줘.';}
});
makeButton('⏹ 중지',stop);
makeButton('✕ 창 숨기기',()=>{root.style.display='none';});
root.append(heading,info,status,actions,detail,notice);document.body.appendChild(root);
window[TAG]={show,stop,get active(){return !stopped;}};
const readOnlyStorage={
 getItem:k=>{try{return localStorage.getItem(k);}catch{return null;}},
 setItem:()=>{},removeItem:()=>{}
};
const money=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<=100000000?v:null;
function normalize(list){
 if(!Array.isArray(list)||list.length>1200)throw Error('예상하지 못한 상품 응답');
 const names=new Set(),rows=[];
 for(const p of list){
  if(!p||typeof p!=='object'||typeof p.sku!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(p.sku)||typeof p.name!=='string')continue;
  const name=p.name.trim().slice(0,90);
  if(!name||names.has(p.sku))continue;
  names.add(p.sku);
  rows.push({sku:p.sku,name,price:money(p.price),fullbox_price:money(p.fullbox_price)});
 }
 return rows;
}
function paint(){
 const fmt=n=>n===null?'미제공':n.toLocaleString('ko-KR')+'원';
 detail.textContent=lastRows.slice(0,80).map(p=>
  p.sku+' · '+p.name+'\n낱개 '+fmt(p.price)+' / 풀박스 '+fmt(p.fullbox_price)).join('\n\n')||
  '회원 가격 데이터가 아직 없어.';
}
async function poll(){
 if(stopped||busy)return;
 busy=true;
 try{
  if(location.origin!=='https://bebepick.me')throw Error('공식 페이지를 벗어났어');
  // A fresh client reads the store's CURRENT browser session each cycle.
  // Never log/copy the token and do not rotate the merchant's refresh token.
  const sb=window.supabase.createClient(app.supabaseUrl,app.supabaseAnonKey,{
   auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',storage:readOnlyStorage}
  });
  const session=await sb.auth.getSession();
  if(!session?.data?.session)throw Error('로그인이 풀렸어 · 공식 홈페이지에서 다시 로그인해 줘');
  const result=await sb.rpc('list_products',{p_brand:BRAND});
  if(result.error)throw Error('상품 조회 오류 '+String(result.error.code||'').slice(0,24));
  const rows=normalize(result.data);
  if(rows.length===0)throw Error('상품 목록이 비어 있어');
  const key=JSON.stringify(rows);
  if(lastKey&&key!==lastKey)changeCount++;
  lastKey=key;lastRows=rows;lastAt=new Date().toISOString();errors=0;
  const priced=rows.filter(p=>p.price!==null).length;
  status.textContent='✅ 자동 확인 ON · '+rows.length+'종 · 가격 '+priced+'종 · 변경 '+changeCount+'회'+
   '\n마지막 조회 '+new Date(lastAt).toLocaleTimeString('ko-KR')+
   (dash&&!dash.closed?' · 재고판 연결됨':' · 재고판 미연결')+
   '\n다음 조회 약 30초 뒤 (탭이 백그라운드면 지연될 수 있음)';
  paint();post();
 }catch(e){
  errors++;
  status.textContent='⚠ '+String(e.message||'조회 실패').slice(0,120)+
    '\n자동 재시도 '+errors+'회 · 실패 시 예전 가격을 새 가격으로 덮어쓰지 않아.';
 }finally{busy=false;}
}
void poll();
timer=setInterval(()=>void poll(),PERIOD);
})();