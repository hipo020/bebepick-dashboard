import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

// Test the exact function served to GitHub Pages, not a duplicate algorithm.
const start = html.indexOf("const normalizeSearch = ");
const end = html.indexOf(";\n", start);
assert.ok(start !== -1 && end !== -1, "search normalizer must exist");
const expression = html.slice(start, end + 1)
  .replace("const normalizeSearch =", "globalThis.normalizeSearch =");
const context = {};
vm.runInNewContext(expression, context);
const normalizeSearch = context.normalizeSearch;

test("search ignores any spacing while retaining Korean letter order", () => {
  const stored = ["유나 유령", "유나유령", "유 나 유 령"];
  for (const query of stored) {
    for (const name of stored) {
      assert.equal(
        normalizeSearch(name).includes(normalizeSearch(query)),
        true,
        JSON.stringify({ name, query })
      );
    }
  }
  assert.equal(
    normalizeSearch("유나\t유령").includes(normalizeSearch("유나 유령")),
    true
  );
  assert.equal(normalizeSearch("  유나 유령  "), "유나유령");
  assert.equal(normalizeSearch("유나유령"), "유나유령");
  assert.equal(normalizeSearch("유령유나").includes(normalizeSearch("유나유령")), false);
});

test("case-insensitive names still search normally and retain displayed names", () => {
  assert.equal(normalizeSearch("Baby  Ghost"), "babyghost");
  assert.equal(normalizeSearch("BABYGHOST"), "babyghost");
  assert.match(html, /<div class="name">/);
  assert.match(html, /normalizeSearch\(p\.name\)\.includes\(q\)/);
});

test("all six requested shortcuts are directly visible without other dropdown", () => {
  const row = html.match(/<div class="filter-row"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(row, "quick-filter row is missing");
  const filters = [...row[1].matchAll(/data-f="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(filters, [
    "available", "all", "hidden", "hidden_stock", "unavailable", "upcoming"
  ]);
  for (const id of ["countAvailable", "countAll", "countHidden",
    "countHiddenStock", "countUnavailable", "countUpcoming"]) {
    assert.ok(row[1].includes('id="' + id + '"'), id);
  }
  const extra = html.match(/<select id="filterSelect"[\s\S]*?<\/select>/);
  assert.ok(extra);
  assert.ok(!/value="all"|value="hidden"/.test(extra[0]));
});

test("filter UI selection and item matching remain available", () => {
  for (const name of [
    "available", "all", "hidden", "hidden_stock", "unavailable", "upcoming"
  ]) {
    assert.ok(html.includes('"' + name + '"'), "missing " + name);
  }
  assert.match(html, /document\.querySelectorAll\("\.chip"\)/);
  assert.match(html, /button\.addEventListener\("click"/);
  assert.match(html, /function syncFilterUI\(\)/);
  assert.match(html, /if \(filter === "hidden" && p\.state !== "hidden"\)/);
});

test("large stock digits and cards were not modified", () => {
  assert.match(html, /\.stock\{text-align:right;min-width:65px;font-size:21px;font-weight:800\}/);
  assert.match(html, /class="stock /);
});
