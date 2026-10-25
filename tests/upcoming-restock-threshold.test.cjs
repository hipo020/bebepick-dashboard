'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin = html.indexOf('function isRecentRestock(p) {');
const end = html.indexOf('function isSpecialProduct(p) {',begin);
assert.ok(begin > 0 && end > begin, 'existing stock classifier source must remain available');
const compiled = html.slice(begin,end);
const {isUpcomingCandidate, isLargeExistingRestock} = vm.runInNewContext(
  compiled + '\n;({isUpcomingCandidate,isLargeExistingRestock})',
  {Date,Number,Math}
);
const now = Date.now(), HOUR = 3600000;
const ago = hours => new Date(now - hours*HOUR).toISOString();
const old = (overrides={}) => ({
 state:'hidden',current_stock:12,source_created_at:ago(24*25),
 hidden_recent_with_stock:true,last_increase_qty:null,last_increase_at:null,...overrides
});
const fresh = (overrides={}) => ({
 state:'hidden',current_stock:50,source_created_at:ago(12),
 hidden_recent_with_stock:false,last_increase_qty:null,last_increase_at:null,...overrides
});

test('existing hidden+stock and recent registration remain the base rules',()=>{
 assert.equal(isUpcomingCandidate(old()),true);
 assert.equal(isUpcomingCandidate(fresh()),true);
 assert.equal(isUpcomingCandidate(old({state:'available'})),false);
 assert.equal(isUpcomingCandidate(fresh({state:'sold_out',current_stock:0})),false);
 assert.equal(isUpcomingCandidate(old({current_stock:0})),false);
 assert.equal(isUpcomingCandidate(old({hidden_recent_with_stock:false})),false);
});

test('an existing item increasing from 2 to 12 (+10) is a restock, not upcoming',()=>{
 const p=old({current_stock:12,last_increase_qty:10,last_increase_at:ago(1)});
 assert.equal(isLargeExistingRestock(p),true);
 assert.equal(isUpcomingCandidate(p),false);
});

test('threshold is relative +10 (not 10 in absolute current inventory)',()=>{
 const nine=old({current_stock:15,last_increase_qty:9,last_increase_at:ago(1)});
 assert.equal(isLargeExistingRestock(nine),false);
 assert.equal(isUpcomingCandidate(nine),true);
 const ten=old({current_stock:15,last_increase_qty:10,last_increase_at:ago(1)});
 assert.equal(isLargeExistingRestock(ten),true);
 assert.equal(isUpcomingCandidate(ten),false);
 const many=old({current_stock:9,last_increase_qty:11,last_increase_at:ago(1)});
 assert.equal(isLargeExistingRestock(many),true);
});

test('first observation with 50 in stock is NOT a restock',()=>{
 assert.equal(isUpcomingCandidate(fresh({current_stock:50})),true);
 assert.equal(isLargeExistingRestock(fresh({current_stock:50})),false);
});

test('recently registered items retain priority if stock was raised during stocking',()=>{
 const p=fresh({current_stock:50,last_increase_qty:50,last_increase_at:ago(1)});
 assert.equal(isLargeExistingRestock(p),false);
 assert.equal(isUpcomingCandidate(p),true);
});

test('restock exclusion requires recent increase timestamp with positive recorded delta',()=>{
 assert.equal(isUpcomingCandidate(old({last_increase_qty:50})),true);
 assert.equal(isUpcomingCandidate(old({last_increase_qty:50,last_increase_at:ago(25)})),true);
 assert.equal(isUpcomingCandidate(old({last_increase_qty:-15,last_increase_at:ago(1)})),true);
 assert.equal(isUpcomingCandidate(old({last_increase_qty:'not-a-number',last_increase_at:ago(1)})),true);
});

test('only one existing upcoming filter, and descriptive restock badge has no new category',()=>{
 assert.match(html,/data-f="upcoming"[^>]*>/);
 assert.match(html,/if \(filter === "upcoming" && !isUpcomingCandidate\(p\)\) return false/);
 assert.doesNotMatch(html,/data-f="large_restock"/);
 assert.match(html,/기존 상품 재입고 추정/);
 assert.match(html,/const LARGE_RESTOCK_INCREASE = 10/);
});
