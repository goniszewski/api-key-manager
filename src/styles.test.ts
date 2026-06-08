import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync("src/styles.css", "utf8");

describe("responsive table density", () => {
  it("keeps compact tag tables row-like at tablet widths", () => {
    expect(styles).toContain(".key-table:not(.compact) .key-row");
    expect(styles).toContain("@media (max-width: 640px)");
  });

  it("keeps the main key table row-like at tablet widths", () => {
    expect(styles).toContain("grid-template-columns: minmax(112px, 1.1fr) 68px 58px 70px 82px minmax(110px, .95fr) 100px;");
    expect(styles).toContain(".key-table:not(.compact) .check-cell small");
    expect(styles).not.toContain(".key-table:not(.compact) .key-row {\n    grid-template-columns: 1fr;");
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

describe("summary metric alignment", () => {
  it("baseline-aligns metric values and labels", () => {
    expect(styles).toContain("display: inline-grid;");
    expect(styles).toContain("align-content: center;");
    expect(styles).toContain("align-items: baseline;");
    expect(styles).toContain(".summary-item strong,\n.summary-item span");
    expect(styles).toContain("line-height: 1;");
  });
});
