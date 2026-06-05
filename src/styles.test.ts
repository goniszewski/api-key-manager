import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync("src/styles.css", "utf8");

describe("responsive table density", () => {
  it("keeps compact tag tables row-like at tablet widths", () => {
    expect(styles).toContain(".key-table:not(.compact) .key-row");
    expect(styles).toContain("@media (max-width: 640px)");
  });
});
