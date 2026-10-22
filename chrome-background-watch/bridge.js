'use strict';
// Receives opt-in v2.4 watch state from the page; no order or payment clicks.
if (location.pathname === '/live' || location.pathname === '/plus') {
  window.addEventListener('bbp-v24-watch-start', event => {
    if (event.detail && typeof event.detail === 'object') {
      chrome.runtime.sendMessage({ type: 'START', plan: event.detail }).catch(() => {});
    }
  });
  window.addEventListener('bbp-v24-watch-stop', () => {
    chrome.runtime.sendMessage({ type: 'STOP' }).catch(() => {});
  });
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type !== 'WAKE') return;
    window.dispatchEvent(new Event('bbp-v24-external-wake'));
    reply({ ok: true });
  });
  window.addEventListener('pagehide', () => {
    chrome.runtime.sendMessage({ type: 'STOP' }).catch(() => {});
  });
}
