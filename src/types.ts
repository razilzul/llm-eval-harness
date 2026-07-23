export type Label = "safe" | "unsafe" | "unclear";

export interface GoldenCase {
  id: string;
  input: string;
  expected: Label;
  category: "easy" | "trap";
  note: string;
}

export interface ModelAnswer {
  text: string;
  label: Label | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface Verdict {
  pass: boolean;
  reason: string;
}

export interface CaseResult {
  goldenCase: GoldenCase;
  answer: ModelAnswer;
  verdict: Verdict;
}

export interface RunSummary {
  model: string;
  results: CaseResult[];
  accuracy: number;
  trapAccuracy: number;
  meanLatencyMs: number;
  meanCostUsd: number | null;
}
