import { describe, expect, it } from "vitest";
import { createKeyRecord, maskKey, mergeMetadataResult } from "./keyRecords";

describe("maskKey", () => {
  it("keeps provider prefix and suffix while hiding the middle", () => {
    expect(maskKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz")).toBe("sk-or-v1...wxyz");
  });
});

describe("createKeyRecord", () => {
  it("normalizes user fields and initializes refresh state", () => {
    const record = createKeyRecord({
      label: " Production ",
      key: "sk-or-v1-abcdefghijklmnopqrstuvwxyz",
      tags: [" Prod ", "prod", "Routing"],
      comment: " Used by app ",
      now: "2026-06-05T12:00:00.000Z",
    });

    expect(record).toMatchObject({
      label: "Production",
      provider: "openrouter",
      providerDetection: {
        provider: "openrouter",
        confidence: "high",
      },
      maskedKey: "sk-or-v1...wxyz",
      tags: ["prod", "routing"],
      comment: "Used by app",
      metadata: null,
      lastCheckedAt: null,
      lastRefreshStatus: "never",
      lastRefreshError: null,
      createdAt: "2026-06-05T12:00:00.000Z",
      updatedAt: "2026-06-05T12:00:00.000Z",
    });
  });
});

describe("mergeMetadataResult", () => {
  it("updates metadata and refresh status without losing existing data on limited results", () => {
    const record = createKeyRecord({
      label: "Production",
      key: "sk-or-v1-abcdefghijklmnopqrstuvwxyz",
      tags: ["prod"],
      comment: "",
      now: "2026-06-05T12:00:00.000Z",
    });

    const refreshed = mergeMetadataResult(
      { ...record, metadata: { balanceLabel: "$12.00" } },
      {
        status: "limited",
        checkedAt: "2026-06-05T12:30:00.000Z",
        metadata: null,
        error: "Provider blocked browser refresh.",
      },
    );

    expect(refreshed.metadata).toEqual({ balanceLabel: "$12.00" });
    expect(refreshed.lastRefreshStatus).toBe("limited");
    expect(refreshed.lastRefreshError).toBe("Provider blocked browser refresh.");
  });
});

