import type { EChartsType } from "echarts/core";
import { connect } from "echarts-extension-chart2music";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canSonifyChart,
  sonifyChart,
} from "../../../src/components/chart/chart-sonification";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { FrontendLocaleData } from "../../../src/data/translation";
import type { HomeAssistant } from "../../../src/types";
import type { HaECSeries } from "../../../src/resources/echarts/echarts";

vi.mock("echarts-extension-chart2music", () => ({
  connect: vi.fn((_chart, options) => {
    options.cc.setAttribute("aria-live", "assertive");
    return { update: vi.fn(), dispose: vi.fn() };
  }),
}));

const series = (
  items: { type: string; id?: string; name?: string; data?: unknown[] }[]
) => items as unknown as HaECSeries;

describe("canSonifyChart", () => {
  it("accepts line and bar series that carry data", () => {
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
        ])
      )
    ).toBe(true);
    expect(
      canSonifyChart(
        series([
          {
            type: "bar",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it("accepts a chart whose empty placeholder series sits beside real data", () => {
    expect(
      canSonifyChart(
        series([
          { type: "bar", data: [] },
          {
            type: "bar",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it("rejects series types the extension cannot convert", () => {
    expect(
      canSonifyChart(
        series([
          {
            type: "custom",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
        ])
      )
    ).toBe(false);
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
          {
            type: "sankey",
            data: [
              [0, 1],
              [1, 2],
            ],
          },
        ])
      )
    ).toBe(false);
  });

  it("rejects charts with nothing plotted", () => {
    expect(canSonifyChart(series([]))).toBe(false);
    expect(canSonifyChart(series([{ type: "line", data: [] }]))).toBe(false);
    expect(canSonifyChart(series([{ type: "line" }]))).toBe(false);
  });

  it("accepts value-first pairs, like the energy device charts", () => {
    // The energy device charts encode [amount, categoryName]. Since v0.1.1 the
    // extension reads a series that way when every item has that shape.
    expect(
      canSonifyChart(
        series([
          {
            type: "bar",
            data: [
              { value: [12.5, "sensor.a"] },
              { value: [8.25, "sensor.b"] },
            ],
          },
        ])
      )
    ).toBe(true);
    expect(
      canSonifyChart(
        series([
          {
            type: "bar",
            data: [
              [12.5, "sensor.a"],
              [8.25, "sensor.b"],
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it("does not read empty markers or numeric strings as value-first pairs", () => {
    // [2, "-"] is an ECharts gap inside an ordinary series and [1, "8"] is a
    // numeric string y; treating either as [y, category] would fabricate
    // points the chart never plotted.
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [1, "-"],
              [2, "-"],
            ],
          },
        ])
      )
    ).toBe(false);
    expect(
      canSonifyChart(
        series([
          {
            type: "line",
            data: [
              [1, "8"],
              [2, "12"],
            ],
          },
        ])
      )
    ).toBe(false);
  });

  it("reads a series value-first only when every item has that shape", () => {
    // A lone [number, string] among ordinary pairs is an unreadable value, not
    // a transposed one.
    expect(
      canSonifyChart(
        series([
          {
            type: "bar",
            data: [
              [12.5, "sensor.a"],
              ["-", "sensor.b"],
            ],
          },
        ])
      )
    ).toBe(false);
  });

  it("rejects a chart left with a single readable point", () => {
    // One device slice alone offers nothing the arrow keys could move between.
    expect(
      canSonifyChart(
        series([{ type: "pie", data: [{ value: [12.5, "sensor.a"] }] }])
      )
    ).toBe(false);
  });

  it("ignores the points of legend-hidden series", () => {
    // Hiding a series strips its data before it reaches ECharts, so it cannot
    // be navigated either.
    const chart = series([
      { type: "line", id: "a", data: [[0, 1]] },
      { type: "line", name: "b", data: [[1, 2]] },
    ]);
    expect(canSonifyChart(chart, new Set())).toBe(true);
    expect(canSonifyChart(chart, new Set(["b"]))).toBe(false);
    expect(canSonifyChart(chart, new Set(["a", "b"]))).toBe(false);
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
              [2, 21.9],
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it("reads the y out of object-form points", () => {
    expect(
      canSonifyChart(
        series([
          { type: "bar", data: [{ value: [0, 0.28] }, { value: [1, 0.31] }] },
        ])
      )
    ).toBe(true);
    expect(
      canSonifyChart(
        series([
          { type: "bar", data: [{ value: [0, null] }, { value: [1, null] }] },
        ])
      )
    ).toBe(false);
  });
});

describe("sonifyChart", () => {
  const mockedConnect = vi.mocked(connect);

  const fakeChart = (option: Record<string, unknown>) =>
    ({
      getOption: () => option,
      on: vi.fn(),
      off: vi.fn(),
    }) as unknown as EChartsType;

  const sonify = (
    option: Record<string, unknown>,
    formatLabel?: (label: string) => string | undefined
  ) =>
    sonifyChart(fakeChart(option), {
      cc: document.createElement("div"),
      localize: ((key: string) => key) as LocalizeFunc,
      locale: { language: "en" } as FrontendLocaleData,
      config: {} as HomeAssistant["config"],
      formatLabel,
      onError: () => undefined,
    });

  const connectedAxes = () => mockedConnect.mock.lastCall![1]!.axes!;

  beforeEach(() => {
    mockedConnect.mockClear();
  });

  it("swaps the axis label sources on horizontal charts", async () => {
    const sonification = await sonify({
      xAxis: [{ type: "value", name: "kWh" }],
      yAxis: [{ type: "category", name: "Device", data: ["a", "b"] }],
      series: [
        {
          type: "bar",
          data: [
            [12.5, "a"],
            [7.25, "b"],
          ],
        },
      ],
    });

    expect(sonification).not.toBeNull();
    // The announced x walks the categories of the y axis, and the announced y
    // is the value from the x axis.
    expect(connectedAxes()).toMatchObject({
      x: { label: "Device" },
      y: { label: "kWh" },
    });
  });

  it("keeps the axis label sources on vertical charts", async () => {
    await sonify({
      xAxis: [{ type: "category", name: "Month", data: ["Jan", "Feb"] }],
      yAxis: [{ type: "value", name: "kWh" }],
      series: [{ type: "bar", data: [5, 9] }],
    });

    expect(connectedAxes()).toMatchObject({
      x: { label: "Month" },
      y: { label: "kWh" },
    });
    // Without a formatter the extension's own labels stay untouched.
    expect(connectedAxes().x.valueLabels).toBeUndefined();
  });

  it("announces category keys through the label formatter", async () => {
    await sonify(
      {
        xAxis: [{ type: "value", name: "kWh" }],
        yAxis: [{ type: "category", data: ["sensor.a", "sensor.b"] }],
        series: [
          {
            type: "bar",
            data: [
              { name: "sensor.a", value: [12.5, "sensor.a"] },
              { name: "sensor.b", value: [7.25, "sensor.b"] },
            ],
          },
        ],
      },
      (label) => (label === "sensor.a" ? "Dishwasher" : "Oven")
    );

    expect(connectedAxes().x.valueLabels).toEqual(["Dishwasher", "Oven"]);
  });

  it("formats pie slice names and keeps the ones the formatter declines", async () => {
    await sonify(
      {
        series: [
          {
            type: "pie",
            data: [
              { name: "sensor.a", value: [12.5, "sensor.a"] },
              { name: "Untracked consumption", value: [7.25, "untracked"] },
            ],
          },
        ],
      },
      (label) => (label === "sensor.a" ? "Dishwasher" : undefined)
    );

    expect(connectedAxes().x.valueLabels).toEqual([
      "Dishwasher",
      "Untracked consumption",
    ]);
  });

  it("labels pie slices even when the options carry hidden empty axes", async () => {
    // ha-chart-base's merged options include default axes even for pies, so
    // an empty category axis must not block the item-name labels.
    await sonify(
      {
        xAxis: [{ type: "category", show: false, data: [] }],
        yAxis: [{ type: "value", show: false }],
        series: [
          {
            type: "pie",
            data: [
              { name: "sensor.a", value: [12.5, "sensor.a"] },
              { name: "sensor.b", value: [7.25, "sensor.b"] },
            ],
          },
        ],
      },
      (label) => (label === "sensor.a" ? "Dishwasher" : "Oven")
    );

    expect(connectedAxes().x.valueLabels).toEqual(["Dishwasher", "Oven"]);
  });

  it("never overrides labels on time axis charts", async () => {
    await sonify(
      {
        xAxis: [{ type: "time" }],
        yAxis: [{ type: "value", name: "°C" }],
        series: [
          {
            type: "line",
            data: [
              [1700000000000, 21.5],
              [1700003600000, 22.1],
            ],
          },
        ],
      },
      () => "wrong"
    );

    expect(connectedAxes()).toMatchObject({
      x: { label: "ui.components.history_charts.time" },
      y: { label: "°C" },
    });
    expect(connectedAxes().x.valueLabels).toBeUndefined();
  });
});
