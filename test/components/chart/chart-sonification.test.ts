import { describe, expect, it } from "vitest";
import { canSonifyChart } from "../../../src/components/chart/chart-sonification";
import type { HaECSeries } from "../../../src/resources/echarts/echarts";

const series = (items: { type: string; data?: unknown[] }[]) =>
  items as unknown as HaECSeries;

describe("canSonifyChart", () => {
  it("accepts line and bar series that carry data", () => {
    expect(canSonifyChart(series([{ type: "line", data: [[0, 1]] }]))).toBe(
      true
    );
    expect(canSonifyChart(series([{ type: "bar", data: [[0, 1]] }]))).toBe(
      true
    );
  });

  it("accepts a chart whose empty placeholder series sits beside real data", () => {
    expect(
      canSonifyChart(
        series([
          { type: "bar", data: [] },
          { type: "bar", data: [[0, 1]] },
        ])
      )
    ).toBe(true);
  });

  it("rejects series types the extension cannot convert", () => {
    expect(canSonifyChart(series([{ type: "custom", data: [[0, 1]] }]))).toBe(
      false
    );
    expect(
      canSonifyChart(
        series([
          { type: "line", data: [[0, 1]] },
          { type: "sankey", data: [[0, 1]] },
        ])
      )
    ).toBe(false);
  });

  it("rejects charts with nothing plotted", () => {
    expect(canSonifyChart(series([]))).toBe(false);
    expect(canSonifyChart(series([{ type: "line", data: [] }]))).toBe(false);
    expect(canSonifyChart(series([{ type: "line" }]))).toBe(false);
  });

  it("rejects a series whose points are all gaps", () => {
    // Chart2Music drops any point without a numeric y, so a series of nothing
    // but nulls converts to an empty group and makes it throw.
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [0, null],
              [1, null],
            ],
          },
        ])
      )
    ).toBe(false);
  });

  it("accepts a series that only becomes numeric partway through", () => {
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [0, null],
              [1, 21.5],
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it("reads the y out of object-form points", () => {
    expect(
      canSonifyChart(series([{ type: "bar", data: [{ value: [0, 0.28] }] }]))
    ).toBe(true);
    expect(
      canSonifyChart(series([{ type: "bar", data: [{ value: [0, null] }] }]))
    ).toBe(false);
  });
});
