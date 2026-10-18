import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGate } from "../src/gate.js";
import type { RunSummary } from "../src/types.js";

const s = (accuracy: number, trapAccuracy: number): RunSummary => ({
  model: "t:x", results: [], accuracy, trapAccuracy, meanLatencyMs: 0, meanCostUsd: null,
});

test("identical accuracy passes", () => {
  const g = evaluateGate(s(0.8, 0.5), s(0.8, 0.5));
  assert.equal(g.passed, true);
  assert.deepEqual(g.reasons, []);
});

test("better candidate passes", () => {
  assert.equal(evaluateGate(s(0.7, 0.4), s(1, 1)).passed, true);
});

test("overall regression fails", () => {
  const g = evaluateGate(s(1, 1), s(0.7, 1));
  assert.equal(g.passed, false);
  assert.equal(g.overall.ok, false);
  assert.equal(g.traps.ok, true);
  assert.equal(g.reasons.length, 1);
});

test("trap regression fails even when overall improves", () => {
  const g = evaluateGate(s(0.7, 0.6), s(0.9, 0.5));
  assert.equal(g.passed, false);
  assert.equal(g.overall.ok, true);
  assert.equal(g.traps.ok, false);
  assert.match(g.reasons[0], /trap accuracy/);
});

test("both regress gives two reasons", () => {
  assert.equal(evaluateGate(s(1, 1), s(0.5, 0.5)).reasons.length, 2);
});
