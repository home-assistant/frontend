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
      // have to do some monkey patching
      // no other way to do this without recwriting the whole Sankey component
      echartsCurve.buildPath = (ctx: CanvasRenderingContext2D) =>
        buildPath(ctx, edgeLayout, curveness);
      echartsCurve.dirtyShape();
    });
  }
}

export default SankeyView;
