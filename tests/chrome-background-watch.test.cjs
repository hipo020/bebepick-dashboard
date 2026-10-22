'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const sandbox = { self: {} };
vm.runInNewContext(read('chrome-background-watch/checks.js'), sandbox);
const { sanitizePlan, isReady, normalize } = sandbox.self.BBPChecks;
const baseWindow = { main: { open: true, enabled: true, closed: false }, china: { open: false } };
const sku = { store: 'main', watchMode: 'sku', items: [{ sku: 'D824', option: 'single', qty: 1 }] };
const names = { store: 'main', watchMode: 'names', nameCandidates: [{ name: '유나 유령', option: 'single', qty: 1 }] };
const cat = [{ sku: 'D824', name: '유나유령', only: 'main', stock: 'low', has_fullbox: true, fullbox_out: false, pack_size: 12, per_person_max: 12 }];

test('All extension scripts parse as JavaScript', () => {
  for (const p of ['chrome-background-watch/checks.js','chrome-background-watch/background.js','chrome-background-watch/bridge.js','bebepick-quick-order-general-v24.js']) {
    assert.doesNotThrow(() => new vm.Script(read(p), { filename: p }), p);
  }
});
test('Invalid channels, unapproved mode and wrong store rejected', () => {
  assert.equal(sanitizePlan(sku, '/plus'), null);
  assert.equal(sanitizePlan({ ...sku, watchMode:'bad' }, '/live'), null);
  assert.equal(sanitizePlan(sku, '/outside'), null);
  assert.equal(sanitizePlan({ ...names, nameCandidates:[] }, '/live'), null);
});
test('Whitespace insensitive but complete name matching', () => {
  assert.equal(normalize('유나 유령'), normalize('유나유령'));
  assert.equal(isReady(baseWindow, cat, sanitizePlan(names, '/live')), true);
  assert.equal(isReady(baseWindow, cat, sanitizePlan({ ...names, nameCandidates:[{ name: '유나', option:'single', qty:1 }] }, '/live')), false);
});
test('Never wake on YouTube-only flag or closed order window', () => {
  const plan = sanitizePlan(sku, '/live');
  assert.equal(isReady({main:{open:false,yt_live:true}},cat,plan),false);
  assert.equal(isReady({main:{open:true,closed:true}},cat,plan),false);
  assert.equal(isReady({main:{open:true,reason:'paused'}},cat,plan),false);
});
test('SKU mode requires ALL items and correct store', () => {
  const p=sanitizePlan({...sku,items:[{sku:'D824',option:'single',qty:1},{sku:'D825',option:'single',qty:1}]},'/live');
  assert.equal(isReady(baseWindow,cat,p),false);
  assert.equal(isReady(baseWindow,cat.concat([{...cat[0],sku:'D825'}]),p),true);
  assert.equal(isReady(baseWindow,[{...cat[0],only:'china'}],sanitizePlan(sku,'/live')),false);
});
test('Name mode refuses duplicate names and duplicate matching SKUs', () => {
  const p=sanitizePlan(names,'/live');
  assert.equal(isReady(baseWindow,cat.concat([{...cat[0],sku:'D999'}]),p),false);
  assert.equal(sanitizePlan({...names,nameCandidates:[...names.nameCandidates,...names.nameCandidates]},'/live'),null);
});
test('Stock and fullbox limits are checked before focusing', () => {
  const plan=sanitizePlan({...sku,items:[{sku:'D824',option:'fullbox',qty:1}]},'/live');
  assert.equal(isReady(baseWindow,cat,plan),true);
  assert.equal(isReady(baseWindow,[{...cat[0],fullbox_out:true}],plan),false);
  assert.equal(isReady(baseWindow,[{...cat[0],per_person_max:10}],plan),false);
  assert.equal(isReady(baseWindow,[{...cat[0],stock:'out'}],plan),false);
});
test('No extension script issues order or payment API calls', () => {
  const scripts=['chrome-background-watch/background.js','chrome-background-watch/bridge.js'].map(read).join('\n');
  assert.doesNotMatch(scripts,/\bcreate_orders\b|\bpayapp_start\b|\bcheckout\.click\(/);
  const main=read('bebepick-quick-order-general-v24.js');
  assert.match(main, /bbp-v24-external-wake/);
  assert.match(main, /backgroundNotify/);
  assert.match(main, /watch-stop/);
  assert.match(main, /if\(dryRun\)/);
});
