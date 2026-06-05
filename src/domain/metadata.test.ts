import { describe, expect, it } from "vitest";
import {
  createLimitedResult,
  createManualResult,
  normalizeDeepSeekBalance,
  normalizeOpenRouterKey,
} from "./metadata";

const checkedAt = "2026-06-05T13:00:00.000Z";

describe("normalizeOpenRouterKey", () => {
  it("maps OpenRouter key metadata into display fields", () => {
    const result = normalizeOpenRouterKey(
      {
        data: {
          label: "Production",
          limit: 100,
          limit_remaining: 42.5,
          usage: 57.5,
          usage_daily: 1.25,
          usage_weekly: 9.5,
          usage_monthly: 31,
          is_free_tier: false,
          expires_at: "2026-11-30T23:59:59Z",
        },
      },
      checkedAt,
    );

    expect(result).toEqual({
      status: "ok",
      checkedAt,
      error: null,
      metadata: {
        balanceLabel: "$42.50 remaining",
        usageLabel: "$31.00 this month",
        limitLabel: "$100.00 limit",
        expiresAt: "2026-11-30T23:59:59Z",
        raw: expect.any(Object),
      },
    });
  });
});

describe("normalizeDeepSeekBalance", () => {
  it("maps DeepSeek balance data into display fields", () => {
    const result = normalizeDeepSeekBalance(
      {
        is_available: true,
        balance_infos: [
          {
            currency: "USD",
            total_balance: "6.31",
            granted_balance: "1.00",
            topped_up_balance: "5.31",
          },
        ],
      },
      checkedAt,
    );

    expect(result).toMatchObject({
      status: "ok",
      checkedAt,
      error: null,
      metadata: {
        balanceLabel: "USD 6.31",
        limitLabel: "Available",
      },
    });
  });
});

describe("manual and limited refresh results", () => {
  it("creates manual result for providers without direct metadata support", () => {
    expect(createManualResult("Gemini billing must be checked in AI Studio.", checkedAt)).toEqual({
      status: "manual",
      checkedAt,
      metadata: null,
      error: "Gemini billing must be checked in AI Studio.",
    });
  });

  it("creates limited result for blocked browser refreshes", () => {
    expect(createLimitedResult("Provider blocked browser refresh.", checkedAt)).toEqual({
      status: "limited",
      checkedAt,
      metadata: null,
      error: "Provider blocked browser refresh.",
    });
  });
});

