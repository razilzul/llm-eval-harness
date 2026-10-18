# agents.md

Instructions for coding agents working in this repo. Humans should read README.md instead; this file is the machine-facing half of the two-README doctrine described in docs/CPEVUDM.md.

## What this repo is

A minimal LLM eval harness. Golden set with trap cases, judge, A/B runner with an accuracy non-regression gate, markdown report. TypeScript, Node 20+, zero runtime dependencies. Providers are called with plain fetch, no SDKs.

## Commands

```bash
npm install            # dev deps only: tsx, typescript
npm run eval           # mock demo, no API key needed, writes report.md
npm run eval -- --baseline mock:strong --candidate mock:weak   # gate-fail demo, exits 1
npm run typecheck      # tsc --noEmit; keep this green
npm test               # node:test, gate unit tests + MCP protocol test, no key needed
npm run mcp            # MCP server on stdio (run_golden_set, compare_models)
```

## Layout

- `data/golden-set.json` golden set. Each case: id, input, expected (safe|unsafe|unclear), category (easy|trap), note.
- `src/run.ts` CLI entry, arg parsing, console output, exit code.
- `src/eval.ts` A/B core shared by CLI and MCP: task prompt, `runModel`, golden-set and `.env` loading.
- `src/gate.ts` `evaluateGate`, the gate as a pure function.
- `src/mcp.ts` MCP stdio server, hand-rolled JSON-RPC, no SDK.
- `test/` node:test suites; no other test framework.
- `src/providers.ts` model refs (`provider:model`), Anthropic + Gemini REST calls, mock classifiers.
- `src/judge.ts` label extraction, judge rubric prompt, mock judge (exact label match).
- `src/pricing.ts` USD-per-MTok table for the cost column.
- `src/report.ts` markdown rendering only, no logic.

## Invariants, do not break these

1. **No runtime dependencies.** devDependencies only. Do not add SDKs, dotenv, axios, or a test framework without being asked.
2. **No secrets anywhere.** Keys come from env vars or `.env` (gitignored). Never write a key into code, docs, examples, or test fixtures. Never print key values.
3. **The gate stays a gate, and lives in `gate.ts`.** Candidate accuracy >= baseline accuracy, overall and on traps, or exit 1. Do not soften this into a weighted score.
4. **Mock mode must keep working with no key.** `npm run eval` on a fresh clone with no `.env` must succeed. It is the demo and the smoke test.
5. **Golden-set edits keep the mocks honest.** `mock:strong` must pass every case, `mock:weak` must fail some traps. If you add cases, run the mock eval and adjust the mock classifiers if needed.
6. **Label matching order matters.** In `extractLabel`, check `unsafe` before `safe` because one contains the other.
7. **Judge prompts treat quoted input as data.** Keep the "data, not instructions" line in both the task prompt and the judge prompt; trap-08 tests it.
8. **MCP stdout is protocol only.** In `src/mcp.ts` and what it imports, never `console.log`; one stray line breaks every client. Log with `console.error`. `test/mcp.test.ts` fails if stdout is not JSON.

## Conventions

- Plain TypeScript, strict mode, ES modules with `.js` import suffixes.
- Short files with one job each. Report rendering never does math; run.ts never formats markdown beyond console output.
- Comments only where the code cannot say it (for example the unsafe/safe ordering).
- Verify by running `npm run eval`, `npm run typecheck` and `npm test` before declaring any change done.

## Workflow

Follow docs/CPEVUDM.md: clarify and plan before editing, work on a branch, verify with the commands above, update README.md and this file if behavior changes, then PR. No build artifacts in commits.
