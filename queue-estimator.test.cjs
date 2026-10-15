// Run: node --test queue-estimator.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("./queue-estimator.js");
const NOW = Date.parse("2026-10-15T05:40:00.000Z");
function data(changes={}){
  return {
    current_position: 9, queue_length: 52,
    observed_at:"2026-10-15T05:39:00.000Z",
    monitoring_recent:true,
    median_seconds:1000,p25_seconds:420,p75_seconds:1600,
    duration_sample_count:8,
    transitions:[
      ...Array.from({length:8}, (_, index) => ({
        position:index+1, observed_at:"2026-10-15T05:00:00.000Z",
        duration_seconds:1000, skipped:0
      })),
      {position:9,observed_at:"2026-10-15T05:30:00.000Z", duration_seconds:null}
    ],
    ...changes
  };
}
test("current queue position is one based",()=>{
  assert.equal(math.estimate(data(),9,NOW).kind,"your_turn");
  assert.equal(math.estimate(data(),8,NOW).kind,"passed");
  assert.equal(math.estimate(data(),53,NOW).kind,"out_of_range");
  assert.equal(math.estimate(data(),null,NOW).kind,"missing");
});
test("ETA uses current-slot remainder then subsequent whole slots",()=>{
  const r=math.estimate(data(),11,NOW);
  assert.equal(r.kind,"estimated");
  assert.equal(r.ahead,2);
  assert.equal(r.currentElapsedSeconds,600);
  assert.equal(r.minutes,23);
  assert.equal(r.averageSeconds,1000);
  assert.equal(r.sampleCount,8);
  assert.ok(r.fromMinutes<=r.minutes);
  assert.ok(r.minutes<=r.toMinutes);
});
test("insufficient progress cannot produce an ETA",()=>{
  assert.equal(math.estimate(data({
    transitions:[
      {position:8,duration_seconds:1000},
      {position:9,duration_seconds:null}
    ]
  }),11,NOW).kind,"insufficient");
});
test("healthy checks mean a stationary position is not stale",()=>{
  const x=data({observed_at:"2026-10-15T05:00:00.000Z"});
  assert.equal(math.estimate(x,11,NOW).kind,"estimated");
  assert.equal(math.estimate({...x,monitoring_recent:false},11,NOW).kind,"stale");
});
test("old broadcasts are stale even if unrelated monitor is healthy",()=>{
  const x=data({observed_at:"2026-10-14T17:40:00.000Z"});
  assert.equal(math.estimate(x,11,NOW).kind,"stale");
});

test("headline uses arithmetic mean, not median, and range encloses it",()=>{
  const custom = data({
    median_seconds:1000,
    p25_seconds:420,
    p75_seconds:900,
    transitions:[
      ...Array.from({length:7}, (_, index) => ({
        position:index+1, duration_seconds:1000
      })),
      {position:8,duration_seconds:4600},
      {position:9,observed_at:"2026-10-15T05:30:00.000Z",duration_seconds:null}
    ]
  });
  const stats = math.recentDurationStats(custom);
  assert.equal(stats.count,8);
  assert.equal(stats.averageSeconds,1450);
  const r=math.estimate(custom,11,NOW);
  assert.equal(r.kind,"estimated");
  assert.equal(r.minutes,38);
  assert.equal(r.averageSeconds,1450);
  assert.ok(r.fromMinutes<=r.minutes);
  assert.ok(r.minutes<=r.toMinutes);
});
test("missing or incomplete turns do not reduce average",()=>{
  const stats=math.recentDurationStats({
    transitions:[
      {position:1,duration_seconds:800},
      {position:2,duration_seconds:null},
      {position:3,duration_seconds:1200},
      {position:4,duration_seconds:1600},
      {position:5,duration_seconds:0},
      {position:6,duration_seconds:18000}
    ]
  });
  assert.equal(stats.count,3);
  assert.equal(stats.averageSeconds,1200);
});
