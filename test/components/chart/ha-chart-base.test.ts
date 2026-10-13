import { describe, expect, it, vi } from "vitest";
import "../../../src/components/chart/ha-chart-base";

const getInternals = (element: HTMLElement) =>
  element as unknown as Record<string, any>;

const createChart = () => {
  const element = document.createElement("ha-chart-base");
  const internals = getInternals(element);
  internals.data = [
    {
      id: "power",
      type: "line",
      data: [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    },
  ];
  internals.chart = { setOption: vi.fn(), getOption: vi.fn(() => ({})) };
  internals._createOptions = vi.fn(() => ({ title: {} }));
  const dispose = vi.fn();
  internals._sonification = { update: vi.fn(), dispose };
  const getSeries = vi.spyOn(internals, "_getSeries");
  return { element, internals, dispose, getSeries };
};

describe("ha-chart-base updates", () => {
  it("does not rebuild the series when only the options change", () => {
    const { internals, getSeries } = createChart();

    internals._applyChartUpdate(new Set(["options"]), undefined);

    expect(getSeries).not.toHaveBeenCalled();
    expect(internals.chart.setOption).toHaveBeenCalledWith(
      { title: {} },
      { replaceMerge: [] }
    );
  });

  it("drops the screen reader connection when the options change", () => {
    const { internals, dispose } = createChart();

    internals._applyChartUpdate(new Set(["options"]), undefined);

    expect(dispose).toHaveBeenCalledOnce();
    expect(internals._sonification).toBeUndefined();
  });

  it("rebuilds the series and drops the connection when a dataset is hidden", () => {
    const { internals, dispose, getSeries } = createChart();

    internals._applyChartUpdate(new Set(["_hiddenDatasets"]), undefined);

    expect(getSeries).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the connection when only the data changes", () => {
    const { internals, dispose, getSeries } = createChart();

    internals._applyChartUpdate(new Set(["data"]), undefined);

    expect(getSeries).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
  });

  it("only flags the hidden datasets when the legend hides a new one", () => {
    const { element, internals } = createChart();
    const requestUpdate = vi.spyOn(element as any, "requestUpdate");
    const hiddenUpdates = () =>
      requestUpdate.mock.calls.filter(([name]) => name === "_hiddenDatasets")
        .length;

    internals.options = { legend: { selected: { power: true } } };
    internals._updateHiddenStatsFromOptions(internals.options);
    expect(hiddenUpdates()).toBe(0);

    internals.options = { legend: { selected: { power: false } } };
    internals._updateHiddenStatsFromOptions(internals.options);
    expect(hiddenUpdates()).toBe(1);
    expect(internals._hiddenDatasets.has("power")).toBe(true);

    internals._updateHiddenStatsFromOptions(internals.options);
    expect(hiddenUpdates()).toBe(1);
  });
});
