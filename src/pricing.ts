// USD per million tokens (input, output). Prices drift; update this table
// when your providers change theirs, and add any model you want costed.
// A model missing from this table still runs; its cost shows as n/a.
const PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-opus-4-8": { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  "claude-sonnet-5": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  "claude-haiku-4-5": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  "gemini-2.5-flash": { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  // Mock models get a token price so the cost column exercises end to end.
  "mock-strong": { inputPerMTok: 0.05, outputPerMTok: 0.1 },
  "mock-weak": { inputPerMTok: 0.05, outputPerMTok: 0.1 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICING[model];
  if (!p) return null;
  return (inputTokens * p.inputPerMTok + outputTokens * p.outputPerMTok) / 1_000_000;
}
