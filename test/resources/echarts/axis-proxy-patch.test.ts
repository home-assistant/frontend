import { describe, it, expect } from "vitest";
import AxisProxy from "echarts/lib/component/dataZoom/AxisProxy";

/**
 * These tests verify that the ECharts internals our axis-proxy-patch relies on
 * still exist. If an ECharts upgrade changes these, the tests will fail,
 * alerting us that the patch in src/resources/echarts/axis-proxy-patch.ts
 * needs to be updated.
 */
describe("ECharts internals required by axis-proxy-patch", () => {
  it("AxisProxy has a filterData method on its prototype", () => {
    expect(typeof (AxisProxy as any).prototype.filterData).toBe("function");
  });

  it("AxisProxy prototype exposes the expected instance fields pattern", () => {
    // The patch accesses these properties via `this` inside filterData:
    //   this._dataZoomModel, this._dimName, this._valueWindow,
    //   this.getTargetSeriesModels()
    // We can't easily construct a real AxisProxy, but we can verify
    // getTargetSeriesModels exists on the prototype.
    expect(typeof (AxisProxy as any).prototype.getTargetSeriesModels).toBe(
      "function"
    );
  });
});

describe("axis-proxy-patch applies boundaryFilter mode", () => {
  it("patches filterData to handle boundaryFilter", async () => {
    // Import the patch (side-effect module)
    await import("../../../src/resources/echarts/axis-proxy-patch");

    const filterData = (AxisProxy as any).prototype.filterData;

    // Create a mock dataZoomModel that requests boundaryFilter
    const mockDataZoomModel = {
      get: (key: string) =>
        key === "filterMode" ? "boundaryFilter" : undefined,
    };

    // The patched filterData should not throw when called with
    // boundaryFilter and a non-matching _dataZoomModel (early return path)
    const mockProxy = {
      _dataZoomModel: "different-model",
    };

    // Should return early because dataZoomModel !== this._dataZoomModel
    expect(() =>
      filterData.call(mockProxy, mockDataZoomModel, {})
    ).not.toThrow();
  });

  it("falls through to original filterData for other filterModes", async () => {
    await import("../../../src/resources/echarts/axis-proxy-patch");

    const filterData = (AxisProxy as any).prototype.filterData;

    // Temporarily replace the original to verify delegation
    const calls: any[] = [];

    // The patched function stores the original in its closure.
    // We can verify it doesn't enter the boundaryFilter path by checking
    // that no boundary-specific logic runs (no getTargetSeriesModels call).
    const mockDataZoomModel = {
      get: (key: string) => (key === "filterMode" ? "filter" : undefined),
    };

    const mockProxy = {
      getTargetSeriesModels: () => {
        calls.push("getTargetSeriesModels");
        return [];
      },
    };

    // Should not throw — the original filterData handles non-matching gracefully
    expect(() =>
      filterData.call(mockProxy, mockDataZoomModel, {})
    ).not.toThrow();

    // getTargetSeriesModels should NOT have been called because the
    // patched function delegates to the original for filterMode !== "boundaryFilter"
    expect(calls).toEqual([]);
  });

  it("filters data keeping boundary points", async () => {
    await import("../../../src/resources/echarts/axis-proxy-patch");

    const filterData = (AxisProxy as any).prototype.filterData;

    // Simulate data: timestamps [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // Zoom window: [3, 7]
    // Expected: keep index 1 (value 2, left boundary), indices 2-6 (in window),
    //           index 7 (value 8, right boundary), filter out 0, 8, 9
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const kept: number[] = [];

    const mockStore = {
      get: (_dimIndex: number, i: number) => values[i],
    };

    const mockSeriesData = {
      mapDimensionsAll: () => ["x"],
      getStore: () => mockStore,
      getDimensionIndex: () => 0,
      count: () => values.length,
      filterSelf: (fn: (idx: number) => boolean) => {
        for (let i = 0; i < values.length; i++) {
          if (fn(i)) {
            kept.push(i);
          }
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      setApproximateExtent: () => {},
    };

    const mockSeriesModel = {
      getData: () => mockSeriesData,
    };

    const mockDataZoomModel = {
      get: (key: string) =>
        key === "filterMode" ? "boundaryFilter" : undefined,
    };

    const mockProxy = {
      _dataZoomModel: mockDataZoomModel,
      _dimName: "x",
      _valueWindow: [3, 7],
      getTargetSeriesModels: () => [mockSeriesModel],
    };

    filterData.call(mockProxy, mockDataZoomModel, {});

    // Index 0 (value 1): filtered out
    // Index 1 (value 2): left boundary (nearest < 3)
    // Index 2-6 (values 3-7): in window
    // Index 7 (value 8): right boundary (nearest > 7)
    // Index 8-9 (values 9-10): filtered out
    expect(kept).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
