import { writeFileSync } from "node:fs";
import { parseModelRef, type ModelRef } from "./providers.js";
import { runModel, loadDotEnv, loadGoldenSet } from "./eval.js";
import { evaluateGate } from "./gate.js";
import { renderReport } from "./report.js";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  loadDotEnv();
  const baselineRef = parseModelRef(arg("baseline", "mock:weak"));
  const candidateRef = parseModelRef(arg("candidate", "mock:strong"));
  // Default judge is the deterministic label matcher. Pass a real model
  // (e.g. --judge anthropic:claude-sonnet-5) to grade free-text answers
  // with the LLM-as-judge rubric instead.
  const judgeRef = parseModelRef(arg("judge", "mock:judge"));
  const outPath = arg("out", "report.md");

  const cases = loadGoldenSet();

  const show = (r: ModelRef) => `${r.provider}:${r.model}`;
  console.log(`Running ${cases.length} cases: baseline=${show(baselineRef)} candidate=${show(candidateRef)} judge=${show(judgeRef)}`);
  const baseline = await runModel(baselineRef, judgeRef, cases);
  const candidate = await runModel(candidateRef, judgeRef, cases);
  const gatePassed = evaluateGate(baseline, candidate).passed;

  const report = renderReport(baseline, candidate, gatePassed);
  writeFileSync(outPath, report, "utf8");
  console.log(report);
  console.log(`Report written to ${outPath}`);
  if (!gatePassed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
