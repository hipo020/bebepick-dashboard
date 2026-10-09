const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const normalizeFn = html.match(/function normalizeSearch\(value\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(normalizeFn, "Expected normalized search function from the real page");
const normalize = vm.runInNewContext(normalizeFn + "\nnormalizeSearch", {});

test("search ignores spaces in BOTH typed query and product name", () => {
  assert.equal(normalize("유나 유령"), "유나유령");
  assert.equal(normalize("유 나 유 령"), "유나유령");
  assert.equal(normalize("유나유령"), "유나유령");
  assert.equal(normalize("유나\t유령\n"), "유나유령");
  assert.ok(normalize("유나 유령 한정").includes(normalize("유나유령")));
  assert.ok(normalize("유나유령").includes(normalize("유나 유령")));
  assert.ok(normalize("YuNa Ghost").includes(normalize("yuna ghost")));
  assert.equal(normalize(null), "");
});

test("top-level tabs expose available, all and ALL hidden products", () => {
  const tabs = [...html.matchAll(/<button class="chip primary(?: on)?" data-f="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(tabs, ["available", "all", "hidden"]);
  const optional = [...html.matchAll(/<button class="chip secondary" data-f="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(optional, ["hidden_stock", "upcoming"]);
  assert.ok(html.includes('id="countAll"'));
  assert.ok(html.includes('id="countHidden"'));
  assert.ok(html.includes('const quickFilters = new Set(["available", "all", "hidden", "hidden_stock", "upcoming"])'));
  assert.ok(!html.includes('<option value="all">'));
  assert.ok(!html.includes('<option value="hidden">'));
});

test("active filter rules and product quantity display are preserved", () => {
  assert.ok(html.includes('if (filter === "hidden" && p.state !== "hidden") return false;'));
  assert.ok(html.includes('if (filter === "available" && p.state !== "available") return false;'));
  assert.ok(html.includes('if (q && !normalizeSearch(p.name).includes(q)) return false;'));
  assert.ok(html.includes('.stock{text-align:right;min-width:65px;font-size:21px;font-weight:800}'));
  assert.ok(html.includes('data-f="hidden_stock"'));
});

test("mobile tabs fit 3 primary and 2 secondary visible buttons", () => {
  assert.ok(html.includes('.filter-row{grid-template-columns:repeat(6,minmax(0,1fr))}'));
  assert.ok(html.includes('.filter-row .chip.primary{grid-column:span 2}'));
  assert.ok(html.includes('.filter-row .chip.secondary{grid-column:span 3}'));
});
