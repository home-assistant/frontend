import { html, nothing } from "lit";
import { describe, expect, it } from "vitest";
import type { LitTooltipFormatter } from "../../../src/resources/echarts/echarts";
import { wrapLitTooltipFormatter } from "../../../src/components/chart/lit-tooltip-formatter";

describe("wrapLitTooltipFormatter", () => {
  it("renders TemplateResult into a stable container", () => {
    const formatter = () => html`<b>Hello</b>`;
    const wrapped = wrapLitTooltipFormatter(formatter);
    const first = wrapped({});
    const second = wrapped({});

    expect(first).toBe(second);
    expect(first?.tagName).toBe("DIV");
    expect(first?.style.display).toBe("contents");
    expect(first?.textContent).toContain("Hello");
  });

  it("returns null for nothing, null, and undefined", () => {
    const returnNothing: LitTooltipFormatter = () => nothing;
    expect(wrapLitTooltipFormatter(returnNothing)({})).toBeNull();
    expect(wrapLitTooltipFormatter(() => null)({})).toBeNull();
    expect(wrapLitTooltipFormatter(() => undefined)({})).toBeNull();
  });

  it("returns the same wrapped function for the same formatter", () => {
    const formatter = () => html`x`;
    expect(wrapLitTooltipFormatter(formatter)).toBe(
      wrapLitTooltipFormatter(formatter)
    );
  });

  it("does not double-wrap an already wrapped formatter", () => {
    const formatter = () => html`x`;
    const wrapped = wrapLitTooltipFormatter(formatter);
    expect(wrapLitTooltipFormatter(wrapped)).toBe(wrapped);
  });
});
