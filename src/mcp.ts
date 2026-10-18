import { createInterface } from "node:readline";
import { parseModelRef } from "./providers.js";
import { runModel, loadDotEnv, loadGoldenSet } from "./eval.js";
import { evaluateGate } from "./gate.js";
import type { RunSummary } from "./types.js";

// Minimal MCP server over stdio: newline-delimited JSON-RPC 2.0, no SDK.
// stdout carries protocol messages only. Anything else goes to stderr.

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const modelProp = (what: string) => ({
  type: "string",
  description: `${what}, as provider:model, e.g. anthropic:claude-haiku-4-5, gemini:gemini-2.5-flash, mock:strong. Real models bill the API key in .env or the client config.`,
});
const judgeProp = {
  type: "string",
  description: "Optional judge model, same format. Default mock:judge (exact label match, free). Use a real model for the LLM-as-judge rubric.",
};

const TOOLS = [
  {
    name: "run_golden_set",
    description: "Run one model over the golden set. Returns accuracy overall and on trap cases, mean latency and cost per request, and the failing cases.",
    inputSchema: {
      type: "object",
      properties: { model: modelProp("Model to evaluate"), judge: judgeProp },
      required: ["model"],
    },
  },
  {
    name: "compare_models",
    description: "A/B two models on the golden set and return the gate verdict. The candidate must match or beat the baseline on accuracy, overall and on traps; only then do latency and cost matter.",
    inputSchema: {
      type: "object",
      properties: {
        baseline: modelProp("Current model"),
        candidate: modelProp("Proposed replacement"),
        judge: judgeProp,
      },
      required: ["baseline", "candidate"],
    },
  },
];

function view(s: RunSummary) {
  return {
    model: s.model,
    accuracy: s.accuracy,
    trapAccuracy: s.trapAccuracy,
    meanLatencyMs: s.meanLatencyMs,
    meanCostUsd: s.meanCostUsd,
    failures: s.results
      .filter((r) => !r.verdict.pass)
      .map((r) => ({ id: r.goldenCase.id, expected: r.goldenCase.expected, got: r.answer.label, note: r.goldenCase.note })),
  };
}

function str(args: Record<string, unknown>, name: string, fallback?: string): string {
  const v = args[name] ?? fallback;
  if (typeof v !== "string" || !v) throw new Error(`Missing string argument "${name}".`);
  return v;
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const judgeRef = parseModelRef(str(args, "judge", "mock:judge"));
  const cases = loadGoldenSet();
  if (name === "run_golden_set") {
    return view(await runModel(parseModelRef(str(args, "model")), judgeRef, cases));
  }
  if (name === "compare_models") {
    const baselineRef = parseModelRef(str(args, "baseline"));
    const candidateRef = parseModelRef(str(args, "candidate"));
    const baseline = await runModel(baselineRef, judgeRef, cases);
    const candidate = await runModel(candidateRef, judgeRef, cases);
    return { gate: evaluateGate(baseline, candidate), baseline: view(baseline), candidate: view(candidate) };
  }
  throw new Error(`Unknown tool "${name}".`);
}

function send(msg: unknown) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

async function handle(msg: any) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification, no reply
  const reply = (result: unknown) => send({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => send({ jsonrpc: "2.0", id, error: { code, message } });
  if (method === "initialize") {
    const asked = params?.protocolVersion;
    return reply({
      protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
      capabilities: { tools: {} },
      serverInfo: { name: "llm-eval-harness", version: "1.0.0" },
    });
  }
  if (method === "ping") return reply({});
  if (method === "tools/list") return reply({ tools: TOOLS });
  if (method === "tools/call") {
    if (!TOOLS.some((t) => t.name === params?.name)) return fail(-32602, `Unknown tool "${params?.name}".`);
    try {
      const out = await callTool(params.name, params.arguments ?? {});
      return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
    } catch (err) {
      return reply({ content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true });
    }
  }
  return fail(-32601, `Method not found: ${method}`);
}

loadDotEnv();
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg: unknown;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  handle(msg).catch((err) => console.error(err instanceof Error ? err.message : err));
});
