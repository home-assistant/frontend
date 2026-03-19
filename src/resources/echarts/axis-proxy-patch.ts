// Patch ECharts AxisProxy to support a "boundaryFilter" filterMode.
//
// ECharts' built-in filterMode "filter" rescales the Y-axis when zooming but
// clips data at the zoom boundaries, causing line gaps at the edges.
// filterMode "none" avoids the gaps but never rescales the Y-axis.
//
// "boundaryFilter" (our custom mode) keeps the nearest data point just outside
// each zoom boundary—so lines draw to the edge without gaps—while still
// filtering out the distant points so ECharts rescales the Y-axis naturally.
//
// The patch is applied once at module load time, before any chart is created.
// Unknown filterMode values pass through to the original implementation, so
// there is no impact on other chart instances.

import AxisProxy from "echarts/lib/component/dataZoom/AxisProxy";

const origFilterData = (AxisProxy as any).prototype.filterData;
(AxisProxy as any).prototype.filterData = function (
  dataZoomModel: any,
  api: any
): void {
  if (dataZoomModel.get("filterMode") !== "boundaryFilter") {
    origFilterData.call(this, dataZoomModel, api);
    return;
  }
  if (dataZoomModel !== this._dataZoomModel) {
    return;
  }
  const axisDim = this._dimName;
  const valueWindow = this._valueWindow;
  const seriesModels = this.getTargetSeriesModels();
  for (const seriesModel of seriesModels) {
    const seriesData = seriesModel.getData();
    const dataDims = seriesData.mapDimensionsAll(axisDim);
    if (!dataDims.length) {
      continue;
    }
    const store = seriesData.getStore();
    const dimIndex = seriesData.getDimensionIndex(dataDims[0]);
    const count = seriesData.count();
    // Phase 1: find the indices of the nearest points just outside each boundary
    let leftBoundaryIdx = -1;
    let rightBoundaryIdx = -1;
    for (let i = 0; i < count; i++) {
      const v = store.get(dimIndex, i);
      if (isNaN(v)) {
        continue;
      }
      if (v < valueWindow[0]) {
        leftBoundaryIdx = i;
      } else if (v > valueWindow[1] && rightBoundaryIdx === -1) {
        rightBoundaryIdx = i;
      }
    }
    // Phase 2: keep in-window points and the two boundary anchor points
    seriesData.filterSelf((dataIndex: number) => {
      if (dataIndex === leftBoundaryIdx || dataIndex === rightBoundaryIdx) {
        return true;
      }
      const v = store.get(dimIndex, dataIndex);
      return !isNaN(v) && v >= valueWindow[0] && v <= valueWindow[1];
    });
    for (const dim of dataDims) {
      seriesData.setApproximateExtent(valueWindow, dim);
    }
  }
};
