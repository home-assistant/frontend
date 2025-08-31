import EchartsSankeyView from "echarts/lib/chart/sankey/sankeyView";
import type GlobalModel from "echarts/types/src/model/Global";
import type SankeySeriesModel from "echarts/types/src/chart/sankey/SankeySeries";
import type ExtensionAPI from "echarts/types/src/core/ExtensionAPI";
import type { SankeyEdgeItemOption } from "echarts/types/src/chart/sankey/SankeySeries";
import type { Path } from "echarts/types/src/util/graphic";
import { buildPath } from "./sankey-path";

class SankeyView extends EchartsSankeyView {
  render(
    seriesModel: SankeySeriesModel,
    ecModel: GlobalModel,
    api: ExtensionAPI
  ) {
    super.render(seriesModel, ecModel, api);
    const edgeData = seriesModel.getData("edge");
    const graph = seriesModel.getGraph();

    graph.eachEdge((edge) => {
      const edgeLayout = edge.getLayout();
      const edgeModel = edge.getModel<SankeyEdgeItemOption>();
      const lineStyleModel = edgeModel.getModel("lineStyle");
      const curveness = lineStyleModel.get("curveness" as any);

      const echartsCurve = edgeData.getItemGraphicEl(edge.dataIndex) as Path;
      /**
       * Monkey patching warning:
       * This code overrides the `buildPath` method of the ECharts internal Path object for Sankey edges.
       * 
       * Compatibility: Tested with ECharts v5.x (update this if you upgrade ECharts).
       * 
       * Reason: ECharts does not currently provide a public API for customizing Sankey edge paths.
       *         To customize the edge shape, we must override the internal method on each edge instance.
       * 
       * Risks: This may break if ECharts changes the internal structure of Sankey edges or the Path class.
       *        Future ECharts updates may render this patch ineffective or cause runtime errors.
       * 
       * Migration path: If ECharts adds a public API for custom edge paths, migrate to that and remove this patch.
       *                 Track ECharts issues: https://github.com/apache/echarts/issues?q=sankey+edge+custom
       */
      echartsCurve.buildPath = (ctx: CanvasRenderingContext2D) =>
        buildPath(ctx, edgeLayout, curveness);
      echartsCurve.dirtyShape();
    });
  }
}

export default SankeyView;
