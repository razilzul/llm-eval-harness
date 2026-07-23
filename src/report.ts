import type { RunSummary } from "./types.js";

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

function usd(x: number | null): string {
  return x === null ? "n/a" : `$${x.toFixed(6)}`;
}

export function renderReport(
  baseline: RunSummary,
  candidate: RunSummary,
  gatePassed: boolean,
): string {
  const lines: string[] = [];
  lines.push(`# Eval report: ${baseline.model} vs ${candidate.model}`);
  lines.push("");
  lines.push(`Golden set: ${baseline.results.length} cases (${baseline.results.filter((r) => r.goldenCase.category === "trap").length} traps).`);
  lines.push("");
  lines.push("| | baseline | candidate |");
  lines.push("|---|---|---|");
  lines.push(`| model | ${baseline.model} | ${candidate.model} |`);
  lines.push(`| accuracy | ${pct(baseline.accuracy)} | ${pct(candidate.accuracy)} |`);
  lines.push(`| trap accuracy | ${pct(baseline.trapAccuracy)} | ${pct(candidate.trapAccuracy)} |`);
  lines.push(`| mean latency | ${baseline.meanLatencyMs.toFixed(0)} ms | ${candidate.meanLatencyMs.toFixed(0)} ms |`);
  lines.push(`| mean cost per request | ${usd(baseline.meanCostUsd)} | ${usd(candidate.meanCostUsd)} |`);
  lines.push("");
  lines.push(
    gatePassed
      ? `**Gate: PASS.** Candidate accuracy is not below baseline, overall and on traps. Latency and cost are now the deciding factors.`
      : `**Gate: FAIL.** Candidate loses accuracy vs baseline. No latency or cost win justifies shipping it.`,
  );
  lines.push("");
  lines.push("## Per case");
  lines.push("");
  lines.push("| case | category | expected | baseline | candidate |");
  lines.push("|---|---|---|---|---|");
  for (let i = 0; i < baseline.results.length; i++) {
    const b = baseline.results[i];
    const c = candidate.results[i];
    const mark = (r: typeof b) => `${r.answer.label ?? "?"} ${r.verdict.pass ? "✓" : "✗"}`;
    lines.push(`| ${b.goldenCase.id} | ${b.goldenCase.category} | ${b.goldenCase.expected} | ${mark(b)} | ${mark(c)} |`);
  }
  const failures = [
    ...baseline.results.filter((r) => !r.verdict.pass).map((r) => ({ who: "baseline", r })),
    ...candidate.results.filter((r) => !r.verdict.pass).map((r) => ({ who: "candidate", r })),
  ];
  if (failures.length > 0) {
    lines.push("");
    lines.push("## Failures");
    lines.push("");
    for (const { who, r } of failures) {
      lines.push(`- **${r.goldenCase.id}** (${who}): ${r.verdict.reason}. ${r.goldenCase.note}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
