import {test} from "node:test";
import assert from "node:assert/strict";
import {parseGalaxyLog,approximateGalaxyMatch,matchTransportSignal} from "../websub-phone-compare.mjs";
const one="YT_NOTIFICATION_RECEIVED channel=bebepick received_at=2026-10-20T10:00:10.100Z android_posted_at=2026-10-20T10:00:09.900Z live_hint=true";
test("only captures anonymous supported channel timing markers",()=>{
 const txt="private_chat=SECRET\n"+one+"\nYT_NOTIFICATION_RECEIVED channel=other received_at=2026-10-20T10:00:00.000Z android_posted_at=- live_hint=true\n"+one;
 const events=parseGalaxyLog(txt);
 assert.equal(events.length,1);
 assert.equal(events[0].channel,"bebepick");
 assert.equal(events[0].androidPostedAt,"2026-10-20T10:00:09.900Z");
 assert.equal(events[0].liveHint,true);
 assert.equal(JSON.stringify(events).includes("SECRET"),false);
});
test("an ambiguous notification is shown but never promoted to LIVE proof",()=>{
 const events=parseGalaxyLog("YT_NOTIFICATION_RECEIVED channel=bebepick_plus received_at=2026-10-20T10:00:10.100Z android_posted_at=- live_hint=false");
 assert.equal(events.length,1);
 assert.equal(events[0].liveHint,false);
 assert.equal(events[0].androidPostedAt,null);
});
test("matching is explicitly approximate, within 15 minutes and per channel",()=>{
 const events=parseGalaxyLog(one);
 const r=approximateGalaxyMatch({
  channel:"bebepick",videoId:"ABCDEFGHIJK",serverPollAt:"2026-10-20T10:00:12.300Z"
 },events);
 assert.equal(r.matchKind,"channel_time_only");
 assert.equal(r.differenceFromAnchorMs,2200);
 assert.equal(approximateGalaxyMatch({channel:"bebepick_plus",serverPollAt:"2026-10-20T10:00:12.300Z"},events),null);
 assert.equal(approximateGalaxyMatch({channel:"bebepick",serverPollAt:"2026-10-20T10:30:12.300Z"},events),null);
});
test("malformed/oversized inputs never create an event",()=>{
 assert.deepEqual(parseGalaxyLog("YT_NOTIFICATION_RECEIVED bad input"),[]);
 assert.throws(()=>parseGalaxyLog("x".repeat(12_000_001)));
});


const server={channel:"bebepick",videoId:"AbCdEfGh123",websubLiveVerifiedAt:"2026-10-20T10:00:08.000Z",serverPollAt:"2026-10-20T10:00:15.000Z"};
const incomingNtfy="2026-10-20 19:00:09.000 · LIVE_SIGNAL_RECEIVED source=ntfy channel=bebepick received_at=2026-10-20T10:00:09.000Z android_posted_at=2026-10-20T10:00:08.900Z video_id=-";
const incomingFcm="LIVE_SIGNAL_RECEIVED source=fcm channel=bebepick received_at=2026-10-20T10:00:10.010Z android_posted_at=- video_id=AbCdEfGh123";
test("parses distinct YouTube, ntfy and verified FCM without touching private content",()=>{
 const input=[one,incomingNtfy,incomingFcm,"personal_chat=PRIVATE secret_token=XYZ",incomingFcm].join("\n");
 const events=parseGalaxyLog(input);
 assert.equal(events.length,3);
 assert.deepEqual(events.map(e=>e.source).sort(),["fcm","ntfy","youtube"]);
 const ntfy=events.find(e=>e.source==="ntfy");
 assert.equal(ntfy.androidPostedAt,"2026-10-20T10:00:08.900Z");
 assert.equal(ntfy.videoId,null);
 const fcm=events.find(e=>e.source==="fcm");
 assert.equal(fcm.videoId,"AbCdEfGh123");
 assert.equal(fcm.androidPostedAt,null);
 assert.equal(JSON.stringify(events).includes("PRIVATE"),false);
});
test("FCM requires video ID and joins by exact video rather than same-channel time",()=>{
 const events=parseGalaxyLog([
 incomingFcm,
 "LIVE_SIGNAL_RECEIVED source=fcm channel=bebepick received_at=2026-10-20T10:00:09.000Z android_posted_at=- video_id=ZbCdEfGh123",
 "LIVE_SIGNAL_RECEIVED source=fcm channel=bebepick received_at=2026-10-20T10:00:09.500Z android_posted_at=- video_id=-",
 "LIVE_SIGNAL_RECEIVED source=fcm channel=bebepick received_at=2026-10-20T10:00:09.500Z android_posted_at=- video_id=bad"
 ].join("\n"));
 assert.equal(events.length,2);
 const match=matchTransportSignal(server,events,"fcm");
 assert.equal(match.matchKind,"exact_video_id");
 assert.equal(match.event.receivedAt,"2026-10-20T10:00:10.010Z");
 assert.equal(matchTransportSignal({...server,videoId:"QbCdEfGh123"},events,"fcm"),null);
});
test("ntfy video ID matches exactly when available; unknown video is tentative",()=>{
 const unknown=parseGalaxyLog(incomingNtfy);
 const fallback=matchTransportSignal(server,unknown,"ntfy");
 assert.equal(fallback.matchKind,"channel_time_only");
 const exact=parseGalaxyLog(incomingNtfy+"\n"+
  "LIVE_SIGNAL_RECEIVED source=ntfy channel=bebepick received_at=2026-10-20T10:00:11.100Z android_posted_at=- video_id=AbCdEfGh123");
 const choice=matchTransportSignal(server,exact,"ntfy");
 assert.equal(choice.matchKind,"exact_video_id");
 assert.equal(choice.event.receivedAt,"2026-10-20T10:00:11.100Z");
});
test("never treats stock, queue, homepage ON, or other channels as LIVE transport",()=>{
 const events=parseGalaxyLog([
  "NTFY_STOCK_UPDATE channel=bebepick received_at=2026-10-20T10:00:10.000Z",
  "LIVE_SIGNAL_RECEIVED source=stock channel=bebepick received_at=2026-10-20T10:00:09.000Z android_posted_at=- video_id=-",
  "LIVE_SIGNAL_RECEIVED source=ntfy channel=someone_else received_at=2026-10-20T10:00:09.000Z android_posted_at=- video_id=-"
 ].join("\n"));
 assert.deepEqual(events,[]);
});
