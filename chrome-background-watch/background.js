/* Chrome MV3 background safety monitor: no authenticated requests or order submission. */
'use strict';
importScripts('checks.js');
const ALARM = 'bebepick-safe-watch';
const KEY = 'armedPlans';
const OFFICIAL = 'https://eqytdtxemjlygnobhiio.supabase.co';
let configCache = null;
let checking = false;
const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'omit', cache: 'no-store', ...options });
  if (!response.ok) {
    const error = new Error('HTTP ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
};
async function officialKey() {
  if (configCache && Date.now() - configCache.at < 600000) return configCache.key;
  const home = await fetch('https://bebepick.me/live', { credentials: 'omit', cache: 'no-store' });
  if (!home.ok) throw Error('Official site unavailable');
  const html = await home.text();
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  let configUrl = '';
  for (const source of sources) {
    const url = new URL(source[1].replaceAll('&amp;', '&'), home.url);
    if (url.origin === 'https://bebepick.me' && url.pathname.endsWith('/config.js')) {
      configUrl = url.href;
      break;
    }
  }
  if (!configUrl) throw Error('Public config script missing');
  const config = await fetch(configUrl, { credentials: 'omit', cache: 'no-store' });
  if (!config.ok) throw Error('Public config unavailable');
  const body = await config.text();
  const url = body.match(/supabaseUrl\s*:\s*['"]([^'"]+)['"]/);
  const key = body.match(/supabaseAnonKey\s*:\s*['"]([^'"]+)['"]/);
  if (!url || url[1] !== OFFICIAL || !key || !/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(key[1])) {
    throw Error('Unsupported public vendor configuration');
  }
  configCache = { at: Date.now(), key: key[1] };
  return key[1];
}
async function rpc(key, name, args) {
  return fetchJson(OFFICIAL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(args)
  });
}
async function plans() { return (await chrome.storage.session.get(KEY))[KEY] || {}; }
async function save(plansToSave) {
  await chrome.storage.session.set({ [KEY]: plansToSave });
  const any = Object.keys(plansToSave).length > 0;
  if (any) {
    if (!await chrome.alarms.get(ALARM)) await chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
  } else {
    await chrome.alarms.clear(ALARM);
  }
  await chrome.action.setBadgeText({ text: any ? 'ON' : '' });
}
async function snapshot(store) {
  const key = await officialKey();
  return Promise.all([rpc(key, 'order_windows', {}), rpc(key, 'list_products', { p_brand: store })]);
}
// All plan state edits are serialized so an in-flight RPC cannot rearm a stopped tab.
let mutationQueue = Promise.resolve();
function mutatePlan(update) {
  const result = mutationQueue.then(async () => {
    const state = await plans();
    const output = update(state);
    await save(state);
    return output;
  });
  mutationQueue = result.catch(() => {});
  return result;
}
async function tick() {
  if (checking) return;
  checking = true;
  try {
    const snapshotPlans = await plans();
    for (const [id, entry] of Object.entries(snapshotPlans)) {
      const tabId = Number(id);
      try {
        const tab = await chrome.tabs.get(tabId);
        const parsed = new URL(tab.url);
        if (parsed.origin !== 'https://bebepick.me' ||
            (parsed.pathname !== '/live' && parsed.pathname !== '/plus') ||
            entry.plan.store !== (parsed.pathname === '/plus' ? 'china' : 'main')) {
          await mutatePlan(state => { delete state[id]; });
          continue;
        }
        if (entry.cooldownUntil > Date.now() || entry.suspendedUntil > Date.now()) continue;
        const [windows, catalog] = await snapshot(entry.plan.store);
        const ready = BBPChecks.isReady(windows, catalog, entry.plan);
        const stillArmed = await mutatePlan(state => {
          const next = state[id];
          if (!next || JSON.stringify(next.plan) !== JSON.stringify(entry.plan)) return false;
          next.lastCheckAt = Date.now();
          next.lastError = '';
          if (ready) next.cooldownUntil = Date.now() + 120000;
          return true;
        });
        if (!ready || !stillArmed) continue;
        // Focus does not submit an order. v2.4 must independently revalidate everything.
        await chrome.tabs.update(tabId, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        await chrome.tabs.sendMessage(tabId, { type: 'WAKE' });
      } catch (error) {
        const status = Number(error && error.status);
        const description = String(error && error.message || error).slice(0, 100);
        await mutatePlan(state => {
          const next = state[id];
          if (!next || JSON.stringify(next.plan) !== JSON.stringify(entry.plan)) return;
          next.lastError = description;
          if (status === 401 || status === 403) delete state[id];
          else next.suspendedUntil = Date.now() + (status === 429 ? 120000 : 30000);
        });
      }
    }
  } finally { checking = false; }
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    const tab = sender.tab;
    if (!tab || !Number.isInteger(tab.id)) return { ok: false };
    const parsed = new URL(tab.url);
    if (parsed.origin !== 'https://bebepick.me') return { ok: false };
    const current = await plans();
    if (msg && msg.type === 'START') {
      const plan = BBPChecks.sanitizePlan(msg.plan, parsed.pathname);
      if (!plan) return { ok: false, error: 'invalid-watch-plan' };
      await mutatePlan(state => {
        state[String(tab.id)] = { plan, lastCheckAt: null, cooldownUntil: 0, suspendedUntil: 0, lastError: '' };
      });
      // First check immediately, then the 30-second alarm supplements foreground polling.
      tick();
      return { ok: true };
    }
    if (msg && msg.type === 'STOP') {
      await mutatePlan(state => { delete state[String(tab.id)]; });
      return { ok: true };
    }
    return { ok: false };
  })().then(reply).catch(error => reply({ ok: false, error: String(error.message || error) }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) tick(); });
chrome.tabs.onRemoved.addListener(async tabId => {
  await mutatePlan(state => { delete state[String(tabId)]; });
});
chrome.tabs.onUpdated.addListener(async (tabId, changes) => {
  if (!changes.url) return;
  await mutatePlan(state => {
    if (!state[String(tabId)]) return;
    try {
      const parsed = new URL(changes.url);
      const store = parsed.pathname === '/plus' ? 'china' : parsed.pathname === '/live' ? 'main' : '';
      if (parsed.origin === 'https://bebepick.me' && store === state[String(tabId)].plan.store) return;
    } catch (_) {}
    delete state[String(tabId)];
  });
});
chrome.runtime.onStartup.addListener(async () => {
  // Session state must not silently rearm after browser restart.
  await mutatePlan(state => { for (const id of Object.keys(state)) delete state[id]; });
});
