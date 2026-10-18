import type { RunSummary } from "./types.js";

export interface GateResult {
  passed: boolean;
  overall: { baseline: number; candidate: number; ok: boolean };
  traps: { baseline: number; candidate: number; ok: boolean };
  reasons: string[];
}

// The gate. Accuracy is a floor, not a metric to trade away. A candidate
// that is faster or cheaper but less accurate does not ship.
export function evaluateGate(baseline: RunSummary, candidate: RunSummary): GateResult {
  const overall = {
    baseline: baseline.accuracy,
    candidate: candidate.accuracy,
    ok: candidate.accuracy >= baseline.accuracy,
  };
  const traps = {
    baseline: baseline.trapAccuracy,
    candidate: candidate.trapAccuracy,
    ok: candidate.trapAccuracy >= baseline.trapAccuracy,
  };
  const reasons: string[] = [];
  if (!overall.ok) reasons.push(`overall accuracy ${overall.baseline.toFixed(2)} -> ${overall.candidate.toFixed(2)}`);
  if (!traps.ok) reasons.push(`trap accuracy ${traps.baseline.toFixed(2)} -> ${traps.candidate.toFixed(2)}`);
  return { passed: overall.ok && traps.ok, overall, traps, reasons };
}
