/* Local nickname preference and exact queue-position lookup.
 * Read-only: no network, no changes to the official queue, no user data uploaded.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.BebepickQueueIdentity=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 const KEY='bebepick_queue_nickname_v1';
 function clean(value){return String(value??'').trim().slice(0,60);}
 function canon(value){return clean(value).toLocaleLowerCase();}
 function read(storage){
  try{return clean((storage||localStorage).getItem(KEY)||'');}catch{return '';}
 }
 function save(value,storage){
  const name=clean(value);
  try{
   const s=storage||localStorage;
   if(name)s.setItem(KEY,name);else s.removeItem(KEY);
   return true;
  }catch{return false;}
 }
 function match(queueData,currentIdx,nickname){
  const wanted=canon(nickname);
  if(!wanted)return null;
  let rows=queueData;
  if(typeof rows==='string'){
   try{rows=JSON.parse(rows);}catch{return null;}
  }
  if(!Array.isArray(rows))return null;
  const positions=[];
  rows.forEach((row,i)=>{if(row&&canon(row.nickname)===wanted)positions.push(i);});
  if(!positions.length)return null;
  // Unknown current position is not treated as 0, so no fake ahead count.
  const n=Number(currentIdx);
  const current=currentIdx!==null&&currentIdx!==undefined&&Number.isSafeInteger(n)&&n>=0?n:null;
  const upcoming=current===null?positions:positions.filter(i=>i>=current);
  const position=upcoming.length?upcoming[0]:positions[positions.length-1];
  return {
   position:position+1,
   ahead:current===null?null:position-current,
   count:positions.length,
   positions:positions.map(x=>x+1),
   currentPosition:current===null?null:current+1
  };
 }
 return {KEY,clean,canon,read,save,match};
});
