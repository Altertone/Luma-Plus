import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../luma-plus.js", import.meta.url), "utf8");
const match = source.match(/\/\* <luma-plus-pure> \*\/([\s\S]*?)\/\* <\/luma-plus-pure> \*\//);
assert.ok(match, "pure helper block exists");
const context = vm.createContext({});
vm.runInContext(
  `${match[1]}\nglobalThis.helpers = { clampOffset, normalizeConfig, normalizeOffsets, readStoredOffset };`,
  context,
);
const helpers = context.helpers;

test("clampOffset bounds and rounds offsets", () => {
  assert.equal(helpers.clampOffset(12.6), 13);
  assert.equal(helpers.clampOffset(-12.6), -13);
  assert.equal(helpers.clampOffset(9000), 5000);
  assert.equal(helpers.clampOffset(-9000), -5000);
  assert.equal(helpers.clampOffset("invalid"), 0);
});

test("normalizeConfig accepts only explicit boolean overrides", () => {
  assert.deepEqual(
    { ...helpers.normalizeConfig({ shortcuts: false, rememberOffsets: true }) },
    { shortcuts: false, rememberOffsets: true },
  );
  assert.deepEqual(
    { ...helpers.normalizeConfig({ shortcuts: "false", rememberOffsets: 0 }) },
    { shortcuts: true, rememberOffsets: true },
  );
  assert.deepEqual(
    { ...helpers.normalizeConfig(null) },
    { shortcuts: true, rememberOffsets: true },
  );
});

test("normalizeOffsets drops invalid entries and clamps valid values", () => {
  assert.deepEqual(
    { ...helpers.normalizeOffsets({ a: 25.7, b: -7000, c: "40", "": 20 }) },
    { a: 26, b: -5000 },
  );
});

test("normalizeOffsets keeps the newest entries within its limit", () => {
  assert.deepEqual(
    { ...helpers.normalizeOffsets({ a: 1, b: 2, c: 3 }, 2) },
    { b: 2, c: 3 },
  );
  assert.deepEqual({ ...helpers.normalizeOffsets({ a: 1 }, 0) }, {});
});

test("readStoredOffset safely reads valid, missing, and malformed settings", () => {
  assert.equal(helpers.readStoredOffset('{"syncOffset":125.4}'), 125);
  assert.equal(helpers.readStoredOffset('{"syncOffset":9000}'), 5000);
  assert.equal(helpers.readStoredOffset("{}"), 0);
  assert.equal(helpers.readStoredOffset("{broken"), 0);
});
