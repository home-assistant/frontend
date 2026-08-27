import { describe, expect, it } from "vitest";
import { SVGRenderer } from "echarts/renderers";
import echarts from "../../../src/resources/echarts/echarts";
import { createYAxisPrecisionBounds } from "../../../src/components/chart/y-axis-fraction-digits";

// jsdom has no canvas, and zrender reaches for one to measure label text.
HTMLCanvasElement.prototype.getContext = (() => ({
  measureText: () => ({ width: 10 }),
})) as any;

// The app registers the canvas renderer; jsdom needs the SVG one.
echarts.use([SVGRenderer]);

// The gap is opened by ECharts' own tick rounding, not by our helper, so these
// assert the extent ECharts actually renders rather than what we hand it.
const renderExtent = (
  data: number[],
  yAxis: Record<string, unknown>,
  nextYAxis?: Record<string, unknown>
): [number, number] => {
  const chart = echarts.init(null, null, {
    ssr: true,
    renderer: "svg",
    width: 400,
    height: 300,
  });
  const option = (axis: Record<string, unknown>) => ({
    xAxis: { type: "category", data: data.map((_, index) => String(index)) },
    yAxis: { type: "value", ...axis },
    series: [{ type: "line", data }],
  });
  chart.setOption(option(yAxis));
  if (nextYAxis) {
    chart.setOption(option(nextYAxis), { replaceMerge: ["series"] });
  }
  // getModel() is internal, but it is the only way to read the rendered extent.
  const extent = (chart as any)
    .getModel()
    .getComponent("yAxis")
    .axis.scale.getExtent();
  chart.dispose();
  return extent;
};

const withGap = (includeZero = false) => ({
  scale: !includeZero,
  ...createYAxisPrecisionBounds({
    includeZero,
    onFractionDigits: () => undefined,
  }),
});

describe("Y-axis tick nudge", () => {
  it("opens a gap under data that lands exactly on a tick", () => {
    // The reported bug: a thermostat's states are quantized, so the minimum is
    // an exact tick and the HVAC action band has nothing to fill.
    expect(renderExtent([18, 21.2, 19], { scale: true })).toEqual([18, 21.5]);
    expect(renderExtent([18, 21.2, 19], withGap())).toEqual([17.5, 21.5]);
  });

  it("leaves an axis with real headroom untouched", () => {
    // Its minimum sits well clear of the tick below it, so the rounding it
    // already gets is enough and the widened extent floors to the same place.
    const data = [18.3, 21.2, 19.5];
    expect(renderExtent(data, withGap())).toEqual(
      renderExtent(data, { scale: true })
    );
  });

  it("keeps a non-negative series anchored at zero", () => {
    expect(renderExtent([0, 3500, 1200], withGap())[0]).toBe(0);
    // Without the clamp the nudged minimum floors a whole interval below zero.
    expect(
      renderExtent([0, 3500, 1200], {
        scale: true,
        boundaryGap: [0.02, 0.02],
      })[0]
    ).toBe(-1000);
  });

  it("keeps the window ECharts gives a constant series", () => {
    expect(renderExtent([21, 21, 21], withGap())).toEqual(
      renderExtent([21, 21, 21], { scale: true })
    );
    // A series flat at zero has no magnitude to expand by.
    expect(renderExtent([0, 0, 0], withGap())).toEqual(
      renderExtent([0, 0, 0], { scale: true })
    );
  });

  it("re-anchors at zero when a chart switches to a zero-anchored type", () => {
    // setOption merges the Y axis, so a gap that is only emitted conditionally
    // survives the switch and leaves the bars floating.
    expect(renderExtent([20, 500, 300], withGap(), withGap(true))[0]).toBe(0);
  });
});
