import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync("src/styles.css", "utf8");

describe("responsive table density", () => {
  it("keeps compact tag tables row-like at tablet widths", () => {
    expect(styles).toContain(".key-table:not(.compact) .key-row");
    expect(styles).toContain("@media (max-width: 640px)");
  });
});

describe("tag chip density", () => {
  it("uses compact pills for tag filters", () => {
    expect(styles).toContain("gap: 6px;");
    expect(styles).toContain("min-height: 26px;");
    expect(styles).toContain("padding: 0 6px;");
    expect(styles).toContain("width: 12px;");
    expect(styles).toContain("min-width: 18px;");
    expect(styles).toContain("height: 18px;");
  });
});
