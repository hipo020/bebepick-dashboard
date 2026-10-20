// Privacy-safe phone event parsing. The TXT is read in-browser only; no uploads.
const ALLOWED_CHANNELS=new Set(["bebepick","bebepick_plus"]);
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_EVENT=/YT_NOTIFICATION_RECEIVED\s+channel=(bebepick(?:_plus)?)\s+received_at=(\S+)\s+android_posted_at=(\S+)\s+live_hint=(true|false)(?:\s|$)/;
const LIVE_TRANSPORT=/LIVE_SIGNAL_RECEIVED\s+source=(ntfy|fcm)\s+channel=(bebepick(?:_plus)?)\s+received_at=(\S+)\s+android_posted_at=(\S+)\s+video_id=(\S+)(?:\s|$)/;
function validTime(s){const epoch=Date.parse(s);return Number.isFinite(epoch)?epoch:null;}
function utcDate(s){const millis=validTime(s);return millis===null?null:new Date(millis).toISOString();}
export function parseGalaxyLog(text){
 if(typeof text!=="string")throw Error("TXT 형식이 아니야");
 if(text.length>12_000_000)throw Error("로그 파일이 너무 커");
 const seen=new Set(),events=[];
 for(const line of text.split(/\r?\n/)){
  const yt=YOUTUBE_EVENT.exec(line),transport=LIVE_TRANSPORT.exec(line);
  if(!yt&&!transport)continue;
  let source,channel,received,posted,liveHint,videoId;
  if(yt){
   source="youtube";[,channel,received,posted]=yt;
   liveHint=yt[4]==="true";videoId=null;
  }else{
   source=transport[1];channel=transport[2];received=transport[3];posted=transport[4];
   liveHint=true;
   videoId=transport[5]==="-"?null:transport[5];
   if(videoId!==null&&!VIDEO_ID.test(videoId))continue;
   // FCM is a server verified video signal; it must carry a real video ID.
   if(source==="fcm"&&!videoId)continue;
  }
  if(!ALLOWED_CHANNELS.has(channel))continue;
  const receivedAt=utcDate(received);
  if(!receivedAt)continue;
  const postedAt=posted==="-"?null:utcDate(posted);
  if(posted!=="-"&&!postedAt)continue;
  const key=[source,channel,receivedAt,postedAt||"-",videoId||"-",liveHint].join("|");
  if(seen.has(key))continue;
  seen.add(key);
  events.push({source,channel,receivedAt,androidPostedAt:postedAt,liveHint,videoId});
 }
 return events.sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,10000);
}
/**
 * Android YouTube notification: there is no verified video ID, so matching
 * based on same channel and a short time window is ALWAYS tentative.
 */
export function approximateGalaxyMatch(broadcast,events,withinMs=15*60*1000){
 const ref=broadcast.websubLiveVerifiedAt||broadcast.serverPollAt||broadcast.websubReceivedAt;
 if(!ref||!ALLOWED_CHANNELS.has(broadcast.channel))return null;
 const refMs=validTime(ref);if(refMs===null)return null;
 let best=null;
 for(const event of events){
  if(event.source!=="youtube"||event.channel!==broadcast.channel)continue;
  const time=validTime(event.receivedAt);if(time===null)continue;
  const delta=refMs-time;
  if(Math.abs(delta)>withinMs)continue;
  const score=Math.abs(delta)+(event.liveHint?0:withinMs/3);
  if(!best||score<best.score)
   best={event,differenceFromAnchorMs:delta,score,matchKind:"channel_time_only"};
 }
 if(!best)return null;
 const {score,...result}=best;
 return result;
}
/**
 * ntfy or FCM phone reception for an observed broadcast.
 * Valid video IDs must match exactly; FCM never falls back to proximity.
 * A ntfy notice lacking video ID can only be linked tentatively.
 */
export function matchTransportSignal(broadcast,events,source){
 if(source!=="ntfy"&&source!=="fcm")throw Error("unsupported source");
 const videoId=broadcast.videoId;
 if(!VIDEO_ID.test(String(videoId||""))||!ALLOWED_CHANNELS.has(broadcast.channel))return null;
 const ref=broadcast.websubLiveVerifiedAt||broadcast.serverPollAt||broadcast.websubReceivedAt;
 const refMs=validTime(ref||"");if(refMs===null)return null;
 const exact=[],approximate=[];
 for(const event of events){
  if(event.source!==source||event.channel!==broadcast.channel)continue;
  const millis=validTime(event.receivedAt);if(millis===null)continue;
  const delta=refMs-millis;
  const exactMatch=event.videoId===videoId;
  if(event.videoId&&!exactMatch)continue;
  if(exactMatch&&Math.abs(delta)<=60*60*1000){
   exact.push({event,differenceFromAnchorMs:delta,matchKind:"exact_video_id"});
  }else if(source==="ntfy"&&!event.videoId&&Math.abs(delta)<=15*60*1000){
   approximate.push({event,differenceFromAnchorMs:delta,matchKind:"channel_time_only"});
  }
 }
 if(exact.length){
  // Earliest validated transport reception of this exact video, not closest.
  exact.sort((a,b)=>Date.parse(a.event.receivedAt)-Date.parse(b.event.receivedAt));
  return exact[0];
 }
 if(approximate.length){
  approximate.sort((a,b)=>Math.abs(a.differenceFromAnchorMs)-Math.abs(b.differenceFromAnchorMs));
  return approximate[0];
 }
 return null;
}
