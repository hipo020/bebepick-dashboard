// Privacy-safe phone event parsing: the TXT is read in the browser only.
const ALLOWED_CHANNELS=new Set(["bebepick","bebepick_plus"]);
const EVENT_RE=/YT_NOTIFICATION_RECEIVED\s+channel=(bebepick(?:_plus)?)\s+received_at=(\S+)\s+android_posted_at=(\S+)\s+live_hint=(true|false)(?:\s|$)/;
function validTime(s){const epoch=Date.parse(s);return Number.isFinite(epoch)?epoch:null;}
export function parseGalaxyLog(text){
 if(typeof text!=="string")throw Error("TXT 형식이 아니야");
 if(text.length>12_000_000)throw Error("로그 파일이 너무 커");
 const seen=new Set(),events=[];
 for(const line of text.split(/\r?\n/)){
  const match=EVENT_RE.exec(line);
  if(!match||!ALLOWED_CHANNELS.has(match[1]))continue;
  const timestamp=validTime(match[2]);
  if(timestamp===null)continue;
  const rawPost=match[3]==="-"?null:validTime(match[3]);
  const key=match[1]+":"+match[2]+":"+match[3]+":"+match[4];
  if(seen.has(key))continue;
  seen.add(key);
  events.push({
   channel:match[1],
   receivedAt:new Date(timestamp).toISOString(),
   androidPostedAt:rawPost===null?null:new Date(rawPost).toISOString(),
   liveHint:match[4]==="true"
  });
 }
 return events.sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,10000);
}
/**
 * A channel-and-clock proximity heuristic, never exact video identification.
 * Comparing clocks from different devices is not an authoritative latency test.
 */
export function approximateGalaxyMatch(broadcast,events,withinMs=15*60*1000){
 const ref=broadcast.websubLiveVerifiedAt||broadcast.serverPollAt||broadcast.websubReceivedAt;
 if(!ref||!ALLOWED_CHANNELS.has(broadcast.channel))return null;
 const refMs=validTime(ref);if(refMs===null)return null;
 let best=null;
 for(const event of events){
  if(event.channel!==broadcast.channel)continue;
  const t=validTime(event.receivedAt);
  if(t===null)continue;
  const delta=refMs-t;
  if(Math.abs(delta)>withinMs)continue;
  // Explicit red-LIVE-style notification is stronger evidence, but never proof.
  const score=Math.abs(delta)+(event.liveHint?0:withinMs/3);
  if(!best||score<best.score)
   best={event,differenceFromAnchorMs:delta,score,matchKind:"channel_time_only"};
 }
 if(!best)return null;
 const {score,...result}=best;
 return result;
}
