import { describe, expect, it } from "vitest";
import { groupKeysByTag, normalizeTags, renameTag } from "./tags";
import type { ApiKeyRecord } from "./types";

const baseRecord = (id: string, tags: string[]): ApiKeyRecord => ({
  id,
  label: id,
  provider: "unknown",
  providerDetection: {
    provider: "unknown",
    confidence: "unknown",
    reason: "No provider-specific prefix matched.",
  },
  maskedKey: "sk...test",
  tags,
  comment: "",
  metadata: null,
  lastCheckedAt: null,
  lastRefreshStatus: "never",
  lastRefreshError: null,
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
});

describe("normalizeTags", () => {
  it("trims, lowercases, removes empty values, and deduplicates tags", () => {
    expect(normalizeTags([" Prod ", "prod", "Routing", "", " routing "])).toEqual(["prod", "routing"]);
  });
});

describe("groupKeysByTag", () => {
  it("groups keys by normalized tag with counts", () => {
    const groups = groupKeysByTag([baseRecord("one", ["prod", "routing"]), baseRecord("two", ["prod"])]);

    expect(groups).toEqual([
      { tag: "prod", count: 2, keys: [baseRecord("one", ["prod", "routing"]), baseRecord("two", ["prod"])] },
      { tag: "routing", count: 1, keys: [baseRecord("one", ["prod", "routing"])] },
    ]);
  });
});

describe("renameTag", () => {
  it("renames a tag across records and preserves other tags", () => {
    const records = [baseRecord("one", ["prod", "routing"]), baseRecord("two", ["lab"])];

    expect(renameTag(records, "prod", "production")).toMatchObject([
      { id: "one", tags: ["production", "routing"] },
      { id: "two", tags: ["lab"] },
    ]);
  });
});

