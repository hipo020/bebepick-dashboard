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
async function tick() {
  if (checking) return;
  checking = true;
  try {
    const current = await plans();
    const now = Date.now();
    for (const [id, entry] of Object.entries(current)) {
      const tabId = Number(id);
      try {
        const tab = await chrome.tabs.get(tabId);
        const parsed = new URL(tab.url);
        if (parsed.origin !== 'https://bebepick.me' || (parsed.pathname !== '/live' && parsed.pathname !== '/plus') ||
            entry.plan.store !== (parsed.pathname === '/plus' ? 'china' : 'main')) {
          delete current[id]; continue;
        }
        if (entry.cooldownUntil > now || entry.suspendedUntil > now) continue;
        const [windows, catalog] = await snapshot(entry.plan.store);
        entry.lastCheckAt = now;
        entry.lastError = '';
        if (!BBPChecks.isReady(windows, catalog, entry.plan)) continue;
        // Record one wake before focusing: no repeated wake storms or accidental second submit.
        entry.cooldownUntil = Date.now() + 120000;
        await chrome.storage.session.set({ [KEY]: current });
        await chrome.tabs.update(tabId, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        await chrome.tabs.sendMessage(tabId, { type: 'WAKE' });
      } catch (error) {
        const status = Number(error && error.status);
        entry.lastError = String(error && error.message || error).slice(0, 100);
        if (status === 401 || status === 403) {
          // Never retry through another identity or bypass vendor access.
          delete current[id];
        } else {
          entry.suspendedUntil = Date.now() + (status === 429 ? 120000 : 30000);
        }
      }
    }
    await save(current);
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
      current[String(tab.id)] = { plan, lastCheckAt: null, cooldownUntil: 0, suspendedUntil: 0, lastError: '' };
      await save(current);
      // First check immediately, then the 30-second alarm supplements foreground polling.
      tick();
      return { ok: true };
    }
    if (msg && msg.type === 'STOP') {
      delete current[String(tab.id)];
      await save(current);
      return { ok: true };
    }
    return { ok: false };
  })().then(reply).catch(error => reply({ ok: false, error: String(error.message || error) }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) tick(); });
chrome.tabs.onRemoved.addListener(async tabId => {
  const current = await plans();
  if (current[String(tabId)]) { delete current[String(tabId)]; await save(current); }
});
chrome.tabs.onUpdated.addListener(async (tabId, changes) => {
  if (!changes.url) return;
  const current = await plans();
  if (!current[String(tabId)]) return;
  try {
    const parsed = new URL(changes.url);
    const store = parsed.pathname === '/plus' ? 'china' : parsed.pathname === '/live' ? 'main' : '';
    if (parsed.origin === 'https://bebepick.me' && store === current[String(tabId)].plan.store) return;
  } catch (_) {}
  delete current[String(tabId)]; await save(current);
});
chrome.runtime.onStartup.addListener(async () => {
  // Session state must not silently rearm after browser restart.
  await save({});
});
