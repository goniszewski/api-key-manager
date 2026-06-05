import { describe, expect, it } from "vitest";
import { detectProvider } from "./providerDetection";

describe("detectProvider", () => {
  it("detects OpenRouter from sk-or-v1 prefix with high confidence", () => {
    expect(detectProvider("sk-or-v1-abc123")).toMatchObject({
      provider: "openrouter",
      confidence: "high",
    });
  });

  it("detects Gemini-style Google API keys", () => {
    expect(detectProvider("AIzaSyA-test-key")).toMatchObject({
      provider: "gemini",
      confidence: "high",
    });
  });

  it("treats OpenAI project keys as medium confidence because sk prefixes overlap", () => {
    expect(detectProvider("sk-proj-test")).toMatchObject({
      provider: "openai",
      confidence: "medium",
    });
  });

  it("returns unknown for unrecognized keys", () => {
    expect(detectProvider("not-a-known-key")).toMatchObject({
      provider: "unknown",
      confidence: "unknown",
    });
  });
});

