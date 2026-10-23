'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'bebepick-quick-order-general-v24.js'), 'utf8');
const required = [
  'qClose', 'qChannel', 'qQuantitySummary', 'qExportAndroid', 'qWatchMode', 'qModeStatus',
  'qNameEditor', 'qNameSummary', 'qName', 'qNameQty', 'qNameOpt', 'qAddName', 'qNames',
  'qSkuEditor', 'qSkuSummary', 'qSearch', 'qSku', 'qManualSku', 'qUseSku', 'qProduct',
  'qQty', 'qAdd', 'qImportCart', 'qBasket', 'qOpt', 'qCycle', 'qOpen', 'qStorage',
  'qAutoOrder', 'qDryRun', 'qPayAppPage', 'qBackgroundWatch', 'qBackgroundStatus',
  'qStatus', 'qActions', 'qStart', 'qStop', 'qLoad', 'qReload',
  'qTiming', 'qTimingSummary', 'qTimingLog', 'qTimingCopy', 'qTimingDownload'
];

function renderedPanelHTML() {
  const from = src.indexOf('panel.innerHTML=');
  const to = src.indexOf('document.body.appendChild(panel);', from);
  assert.ok(from > 0 && to > from, 'Panel assignment must precede insertion into document');
  // Execute ONLY the static markup assignment; never run the order helper or network calls.
  return new Function(
    "const panel={innerHTML:''};const inputStyle='width:100%';const rowStyle='display:flex';\n" +
    src.slice(from, to) + '\nreturn panel.innerHTML;'
  )();
}

test('entire bookmarklet remains syntactically valid', () =>
  assert.doesNotThrow(() => new Function(src)));

test('all 42 mandatory UI IDs really occur in computed HTML, not merely source strings', () => {
  const html = renderedPanelHTML();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.ok(html.length > 6500, 'Panel HTML must not be cut short by automatic semicolon insertion');
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'Duplicate IDs');
  assert.deepEqual(required.filter(id => !ids.includes(id)), [], 'Required markup missing after rendering');
  assert.ok(html.indexOf('id="qBasket"') < html.indexOf('id="qStart"'),
    'Start controls must still render after the SKU basket');
  assert.match(html, /id="qDryRun" checked/);
});

test('computed panel HTML has balanced non-void tags', () => {
  const html = renderedPanelHTML();
  const stack = [];
  for (const m of html.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const tag = m[2].toLowerCase();
    if (['input', 'img', 'br', 'hr', 'link', 'meta'].includes(tag)) continue;
    if (!m[1]) stack.push(tag);
    else assert.equal(stack.pop(), tag, 'Unbalanced markup around byte ' + m.index);
  }
  assert.deepEqual(stack, []);
});

test('all direct click-handler element selectors are present in computed panel', () => {
  const html = renderedPanelHTML();
  for (const match of src.matchAll(/el\('#(q[A-Za-z0-9]+)',panel\)\.onclick\s*=/g)) {
    assert.ok(html.includes('id="' + match[1] + '"'), match[1] + ' not rendered');
  }
});
