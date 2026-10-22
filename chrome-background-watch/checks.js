/* Pure validation, shared by the service worker and tests. No checkout or credentials. */
(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
  const validSku = value => /^[A-Z0-9-]{2,24}$/.test(String(value || ''));
  function validItem(x) {
    return x && validSku(x.sku) && ['single', 'fullbox'].includes(x.option) &&
      Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 99;
  }
  function validName(x) {
    return x && typeof x.name === 'string' && x.name.trim().length >= 2 &&
      x.name.length <= 90 && !/[\u0000-\u001f<>]/.test(x.name) &&
      ['single', 'fullbox'].includes(x.option) && Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 99;
  }
  function sanitizePlan(raw, pathname) {
    const store = pathname === '/plus' ? 'china' : pathname === '/live' ? 'main' : '';
    if (!store || !raw || raw.store !== store || !['sku', 'names'].includes(raw.watchMode)) return null;
    if (raw.watchMode === 'names') {
      const names = raw.nameCandidates;
      if (!Array.isArray(names) || names.length < 1 || names.length > 20 || !names.every(validName)) return null;
      if (new Set(names.map(c => normalize(c.name))).size !== names.length) return null;
      return { store, watchMode: 'names', nameCandidates: names.map(x => ({ name: x.name.trim(), option: x.option, qty: x.qty })) };
    }
    const items = raw.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 20 || !items.every(validItem)) return null;
    return { store, watchMode: 'sku', items: items.map(x => ({ sku: x.sku, option: x.option, qty: x.qty })) };
  }
  function availableHere(p, store) { return p && (!p.only || p.only === store); }
  function saleable(p, x, store) {
    if (!availableHere(p, store) || !validSku(p.sku) ||
        !(p.stock === null || p.stock === 'low')) return false;
    if (x.option === 'fullbox' && !(p.has_fullbox && p.pack_size > 1 && p.fullbox_out === false)) return false;
    const quantity = x.qty * (x.option === 'fullbox' ? Number(p.pack_size) : 1);
    if (p.per_person_max && quantity > Number(p.per_person_max)) return false;
    return true;
  }
  function isReady(windows, catalog, plan) {
    if (!plan || !windows || !Array.isArray(catalog)) return false;
    const w = windows[plan.store];
    if (!w || w.open !== true || w.enabled === false || w.closed === true || w.reason === 'paused') return false;
    if (plan.watchMode === 'sku') {
      return plan.items.every(x => {
        const matched = catalog.filter(p => p && p.sku === x.sku && availableHere(p, plan.store));
        return matched.length === 1 && saleable(matched[0], x, plan.store);
      });
    }
    return plan.nameCandidates.some(x => {
      const matched = catalog.filter(p => p && validSku(p.sku) && availableHere(p, plan.store) && normalize(p.name) === normalize(x.name));
      return matched.length === 1 && saleable(matched[0], x, plan.store);
    });
  }
  root.BBPChecks = Object.freeze({ normalize, sanitizePlan, isReady });
})(typeof self === 'undefined' ? globalThis : self);
