import {test} from "node:test";
import assert from "node:assert/strict";
import {parseGalaxyLog,approximateGalaxyMatch} from "../websub-phone-compare.mjs";
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
