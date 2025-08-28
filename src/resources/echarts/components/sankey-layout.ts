import type { GlobalModel } from "echarts/types/dist/shared";
import type SankeySeriesModel from "echarts/types/src/chart/sankey/SankeySeries";
import type { SankeyNodeItemOption } from "echarts/types/src/chart/sankey/SankeySeries";
import type { GraphNode, GraphEdge } from "echarts/types/src/data/Graph";
import type { EChartsExtensionInstallRegisters } from "echarts/types/src/extension";
import type ExtensionAPI from "echarts/types/src/core/ExtensionAPI";

interface PassThroughNode {
  passThrough: boolean;
  id: string;
  value: number;
  index: number;
};

interface GraphLink extends GraphEdge {
  passThroughNodeIds: string[];
}

export default function install(registers: EChartsExtensionInstallRegisters) {
  registers.registerLayout(sankeyLayout);
}

function sankeyLayout(ecModel: GlobalModel, _api: ExtensionAPI) {
  ecModel.eachSeriesByType("sankey", (seriesModel: SankeySeriesModel) => {
    if (seriesModel.get("nodeAlign") !== "justify") {
      // Only handle justify nodes for now
      return;
    }

    const nodeWidth = seriesModel.get("nodeWidth")!;
    const nodeGap = seriesModel.get("nodeGap")!;

    const { layoutInfo } = seriesModel;

    const width = layoutInfo.width;
    const height = layoutInfo.height;

    const graph = seriesModel.getGraph();

    const nodes = graph.nodes;
    const edges = graph.edges;

    const orient = seriesModel.get("orient")!;

    layoutSankey(nodes, edges, nodeWidth, nodeGap, width, height, orient);
  });
}

function layoutSankey(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeWidth: number,
  nodeGap: number,
  width: number,
  height: number,
  orient: "vertical" | "horizontal"
) {
  // const nodeItems = nodes.map(
  //   (node) =>
  //     node.hostGraph.data.getRawDataItem(node.dataIndex) as SankeyNodeItemOption
  // );
  const filteredNodes = nodes.filter((node) => node.getLayout().value > 0);
  const depths = [
    ...new Set(
      filteredNodes.map(
        (n) =>
          (n.hostGraph.data.getRawDataItem(n.dataIndex) as SankeyNodeItemOption)
            .depth || 0
      )
    ),
  ].sort();
  const { links, passThroughNodes } = processLinks(depths, edges);
  processNodes(filteredNodes, passThroughNodes, depths, width, height, orient);
  //   processPaths(nodes, links);
}

function processLinks(
  depths: number[],
  edges: GraphEdge[]
) {
  const links: GraphLink[] = [];
  const passThroughNodes: PassThroughNode[] = [];

  edges.forEach((edge) => {
    if (edge.getLayout().value === 0) {
      return;
    }
    const sourceNode = edge.node1.hostGraph.data.getRawDataItem(edge.node1.dataIndex) as SankeyNodeItemOption;
    const targetNode = edge.node2.hostGraph.data.getRawDataItem(edge.node2.dataIndex) as SankeyNodeItemOption;
    // handle links across sections
    const sourceIndex = depths.findIndex((i) => i === sourceNode.depth);
    const targetIndex = depths.findIndex((i) => i === targetNode.depth);
    const passThroughSections = depths.slice(sourceIndex + 1, targetIndex);
    // create pass-through nodes to reserve space
    const passThroughNodeIds = passThroughSections.map((index) => {
      const node = {
        passThrough: true,
        id: `${sourceNode.id}-${targetNode.id}-${index}`,
        value: edge.getLayout().value,
        index,
      };
      passThroughNodes.push(node);
      return node.id;
    });
    const link = edge as GraphLink;
    link.passThroughNodeIds = passThroughNodeIds;
    links.push(link);
  });

  return { links, passThroughNodes };
}

function processNodes(nodes: GraphNode[], passThroughNodes: PassThroughNode[], depths: number[], width: number, height: number, orient: "vertical" | "horizontal") {
  const sectionSize = orient === "vertical" ? width : height;
}

function processPaths(nodes: GraphNode[], links: GraphLink[]) {
  // @TODO
}
