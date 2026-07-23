import type { Label } from "./types.js";

// A model reference looks like "provider:model", e.g.
//   anthropic:claude-haiku-4-5
//   gemini:gemini-2.5-flash
//   mock:strong
export interface ModelRef {
  provider: "anthropic" | "gemini" | "mock";
  model: string;
}

export function parseModelRef(ref: string): ModelRef {
  const idx = ref.indexOf(":");
  if (idx < 0) throw new Error(`Bad model ref "${ref}". Use provider:model, e.g. anthropic:claude-haiku-4-5 or mock:strong.`);
  const provider = ref.slice(0, idx);
  const model = ref.slice(idx + 1);
  if (provider !== "anthropic" && provider !== "gemini" && provider !== "mock") {
    throw new Error(`Unknown provider "${provider}". Supported: anthropic, gemini, mock.`);
  }
  return { provider, model };
}

export interface RawCompletion {
  text: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export async function complete(ref: ModelRef, prompt: string): Promise<RawCompletion> {
  const start = performance.now();
  let out: { text: string; inputTokens: number; outputTokens: number };
  if (ref.provider === "anthropic") out = await callAnthropic(ref.model, prompt);
  else if (ref.provider === "gemini") out = await callGemini(ref.model, prompt);
  else out = mockComplete(ref.model, prompt);
  return { ...out, latencyMs: performance.now() - start };
}

function requireKey(name: string): string {
  const key = process.env[name];
  if (!key) throw new Error(`${name} is not set. Copy .env.example to .env, or run in mock mode (mock:strong / mock:weak).`);
  return key;
}

async function callAnthropic(model: string, prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": requireKey("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const text = (json.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return {
    text,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

async function callGemini(model: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": requireKey("GEMINI_API_KEY"),
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text ?? "")
    .join("");
  return {
    text,
    inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// Mock mode: two deterministic keyword classifiers standing in for LLMs, so the
// harness runs end to end with no API key. They are honest about what they are.
//
//   mock:weak    naive substring match on "peanut". Misses synonym traps
//                (groundnut, arachis, satay) and mislabels hedge cases.
//   mock:strong  knows the synonyms and treats "may contain" style warnings
//                as unclear. Passes the golden set.
//
// The point of the demo: run weak as baseline and strong as candidate and the
// gate passes; swap them and the gate blocks the "upgrade".
function mockComplete(variant: string, prompt: string) {
  const text = prompt.toLowerCase();
  // Both variants classify only the ingredient list, not the surrounding prompt.
  const listMatch = text.match(/ingredient list: """([^]*?)"""/);
  const list = listMatch ? listMatch[1] : text;
  let label: Label;
  if (variant === "weak") {
    label = list.includes("peanut") ? "unsafe" : "safe";
  } else if (variant === "strong") {
    const synonyms = ["peanut", "groundnut", "arachis", "satay", "goober"];
    const hedgeRe = /may contain|traces of|facility that also processes/;
    const hedge = hedgeRe.test(list);
    // A synonym inside the hedge clause ("may contain traces of peanuts") is
    // not a listed ingredient, so only look before the hedge for real peanut.
    const beforeHedge = hedge ? list.split(hedgeRe)[0] : list;
    const listedPeanut = synonyms.some((s) => beforeHedge.includes(s));
    if (listedPeanut) label = "unsafe";
    else if (hedge) label = "unclear";
    else label = "safe";
  } else {
    throw new Error(`Unknown mock variant "${variant}". Use mock:strong or mock:weak.`);
  }
  const answer = `${label}\nmock ${variant} classifier: keyword decision, stands in for a real model.`;
  // Rough token estimate so the cost column has something real to multiply.
  return {
    text: answer,
    inputTokens: Math.ceil(prompt.length / 4),
    outputTokens: Math.ceil(answer.length / 4),
  };
}
