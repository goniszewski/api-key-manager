import type { ProviderDetection } from "./types";

const UNKNOWN_DETECTION: ProviderDetection = {
  provider: "unknown",
  confidence: "unknown",
  reason: "No provider-specific prefix matched.",
};

export function detectProvider(rawKey: string): ProviderDetection {
  const key = rawKey.trim();

  if (key.startsWith("sk-or-v1-")) {
    return {
      provider: "openrouter",
      confidence: "high",
      reason: "Matched OpenRouter sk-or-v1 prefix.",
    };
  }

  if (key.startsWith("AIza")) {
    return {
      provider: "gemini",
      confidence: "high",
      reason: "Matched Google API key shape commonly used for Gemini.",
    };
  }

  if (key.startsWith("sk-ant-")) {
    return {
      provider: "anthropic",
      confidence: "high",
      reason: "Matched Anthropic key prefix.",
    };
  }

  if (key.startsWith("sk-proj-") || key.startsWith("sk-")) {
    return {
      provider: "openai",
      confidence: "medium",
      reason: "Matched OpenAI-style sk prefix, which can overlap with other providers.",
    };
  }

  return UNKNOWN_DETECTION;
}

