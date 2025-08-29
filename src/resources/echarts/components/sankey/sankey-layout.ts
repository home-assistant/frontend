import type { GlobalModel } from "echarts/types/dist/shared";
import type SankeySeriesModel from "echarts/types/src/chart/sankey/SankeySeries";
import type {
  SankeyEdgeItemOption,
  SankeyNodeItemOption,
} from "echarts/types/src/chart/sankey/SankeySeries";
import type { GraphNode, GraphEdge } from "echarts/types/src/data/Graph";
import type ExtensionAPI from "echarts/types/src/core/ExtensionAPI";
import { createBoxLayoutReference } from "echarts/lib/util/layout";
import type { SankeyPathShape } from "./sankey-path";

interface PassThroughNode {
  passThrough: boolean;
  id: string;
  value: number;
  depth: number;
}

interface GraphLink extends GraphEdge {
  passThroughNodeIds: string[];
}

type Node = GraphNode | PassThroughNode;

interface SectionNode {
  node: Node;
  id: string;
  value: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}

function isPassThroughNode(node: Node): node is PassThroughNode {
  return "passThrough" in node;
}

const MIN_SIZE = 1;

export default function sankeyLayout(ecModel: GlobalModel, _api: ExtensionAPI) {
  ecModel.eachSeriesByType("sankey", (seriesModel: SankeySeriesModel) => {
    if (seriesModel.get("nodeAlign") !== "justify") {
      // Only handle justify nodes for now
      return;
    }

    const nodeWidth = seriesModel.get("nodeWidth")!;
    const nodeGap = seriesModel.get("nodeGap")!;

    const refContainer = createBoxLayoutReference(
      seriesModel,
      _api
    ).refContainer;

    const { width, height } = refContainer;

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
  const passThroughNodes = generatePassThroughNodes(depths, edges);
  const processedNodes = processNodes(
    filteredNodes,
    passThroughNodes,
    depths,
    width,
    height,
    orient,
    nodeGap
  );
  applyLayout(processedNodes, nodeWidth, orient);
}

function generatePassThroughNodes(depths: number[], edges: GraphEdge[]) {
  const passThroughNodes: PassThroughNode[] = [];

  edges.forEach((edge) => {
    if (edge.getLayout().value === 0) {
      return;
    }
    const sourceNode = edge.node1.hostGraph.data.getRawDataItem(
      edge.node1.dataIndex
    ) as SankeyNodeItemOption;
    const targetNode = edge.node2.hostGraph.data.getRawDataItem(
      edge.node2.dataIndex
    ) as SankeyNodeItemOption;
    // handle links across sections
    const sourceIndex = depths.findIndex((i) => i === sourceNode.depth);
    const targetIndex = depths.findIndex((i) => i === targetNode.depth);
    const edgeItem = edge.hostGraph.edgeData.getRawDataItem(
      edge.dataIndex
    ) as SankeyEdgeItemOption;
    const passThroughSections = depths.slice(sourceIndex + 1, targetIndex);
    // create pass-through nodes to reserve space
    const passThroughNodeIds = passThroughSections.map((depth) => {
      const node: PassThroughNode = {
        passThrough: true,
        id: `${sourceNode.id}-${targetNode.id}-${depth}`,
        value: edgeItem.value as number,
        depth,
      };
      passThroughNodes.push(node);
      return node.id;
    });
    const link = edge as GraphLink;
    link.passThroughNodeIds = passThroughNodeIds;
  });

  return passThroughNodes;
}

function processNodes(
  nodes: GraphNode[],
  passThroughNodes: PassThroughNode[],
  depths: number[],
  width: number,
  height: number,
  orient: "vertical" | "horizontal",
  nodeGap: number
) {
  const sectionSize = (orient === "vertical" ? width : height) - nodeGap * 2;
  const sectionFlexSize =
    orient === "vertical" ? height / depths.length : width / depths.length;

  const nodesPerSection: Record<number, Node[]> = {};
  nodes.forEach((node) => {
    if (!nodesPerSection[node.getLayout().depth]) {
      nodesPerSection[node.getLayout().depth] = [node];
    } else {
      nodesPerSection[node.getLayout().depth].push(node);
    }
  });
  passThroughNodes.forEach((node) => {
    if (!nodesPerSection[node.depth]) {
      nodesPerSection[node.depth] = [node];
    } else {
      nodesPerSection[node.depth].push(node);
    }
  });

  let statePerPixel = 0;

  const sections = depths.map((depth) => {
    const sectionNodes = nodesPerSection[depth].map(
      (node: Node): SectionNode => ({
        node,
        id: node.id,
        value: isPassThroughNode(node) ? node.value : node.getLayout().value,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        size: 0,
      })
    );
    const availableSpace = sectionSize - (sectionNodes.length + 1) * nodeGap;
    const totalValue = sectionNodes.reduce(
      (acc: number, node: SectionNode) => acc + node.value,
      0
    );
    const { nodes: sizedNodes, statePerPixel: sectionStatePerPixel } =
      setNodeSizes(sectionNodes, availableSpace, totalValue, statePerPixel);
    if (sectionStatePerPixel > statePerPixel) {
      statePerPixel = sectionStatePerPixel;
    }
    return {
      nodes: sizedNodes,
      depth,
      totalValue,
      statePerPixel: sectionStatePerPixel,
    };
  });

  sections.forEach((section, index) => {
    // calc sizes again with the best statePerPixel
    let totalSize = 0;
    if (section.statePerPixel !== statePerPixel) {
      section.nodes.forEach((node) => {
        const size = Math.max(MIN_SIZE, Math.floor(node.value / statePerPixel));
        totalSize += size;
        node.size = size;
      });
    } else {
      totalSize = section.nodes.reduce((sum, b) => sum + b.size, 0);
    }
    // calc margin between boxes
    const emptySpace = sectionSize - totalSize;
    const spacerSize = emptySpace / (section.nodes.length + 1);

    // align-items: space-between
    let offset = emptySpace / (section.nodes.length + 1);
    // calc positions - swap x/y for vertical layout
    section.nodes.forEach((node) => {
      if (orient === "vertical") {
        node.x = offset;
        node.y = index * sectionFlexSize;
      } else {
        node.x = index * sectionFlexSize;
        node.y = offset;
      }
      offset += node.size + spacerSize;
    });
  });

  return sections.flatMap((section) => section.nodes);
}

function setNodeSizes(
  nodes: SectionNode[],
  availableSpace: number,
  totalValue: number,
  prevStatePerPixel = 0
): { nodes: SectionNode[]; statePerPixel: number } {
  let statePerPixel = totalValue / availableSpace;
  if (statePerPixel < prevStatePerPixel) {
    statePerPixel = prevStatePerPixel;
  }
  let deficitHeight = 0;
  const result = nodes.map((node) => {
    if (node.size === MIN_SIZE) {
      return node;
    }
    let size = Math.floor(node.value / statePerPixel);
    if (size < MIN_SIZE) {
      deficitHeight += MIN_SIZE - size;
      size = MIN_SIZE;
    }
    return {
      ...node,
      size,
    };
  });
  if (deficitHeight > 0) {
    return setNodeSizes(
      result,
      availableSpace - deficitHeight,
      totalValue,
      statePerPixel
    );
  }
  return { nodes: result, statePerPixel };
}

function applyLayout(
  nodes: SectionNode[],
  nodeWidth: number,
  orient: "vertical" | "horizontal"
) {
  const breadthCoord = orient === "vertical" ? "x" : "y";
  const breadthAttr = orient === "vertical" ? "dx" : "dy";
  const depthAttr = orient === "vertical" ? "dy" : "dx";
  nodes.forEach((node) => {
    node[breadthAttr] = node.size;
    node[depthAttr] = nodeWidth;
    if (isPassThroughNode(node.node)) {
      return;
    }
    node.node.setLayout(
      { x: node.x, y: node.y, dx: node.dx, dy: node.dy },
      true
    );
    node.node.outEdges.forEach((edge) => {
      const edgeItem = edge.hostGraph.edgeData.getRawDataItem(
        edge.dataIndex
      ) as SankeyEdgeItemOption;
      const edgeSize = ((edgeItem.value as number) / node.value) * node.size;
      edge.setLayout({ [breadthAttr]: edgeSize, [depthAttr]: 0 }, true);
    });
  });

  const curveType = orient === "vertical" ? "curveVertical" : "curveHorizontal";
  nodes.forEach((node) => {
    if (isPassThroughNode(node.node)) {
      return;
    }

    node.node.outEdges.sort(
      (a, b) =>
        a.node2.getLayout()[breadthCoord] - b.node2.getLayout()[breadthCoord]
    );
    node.node.inEdges.sort(
      (a, b) =>
        a.node1.getLayout()[breadthCoord] - b.node1.getLayout()[breadthCoord]
    );
    let offset = 0;
    node.node.outEdges.forEach((edge) => {
      edge.setLayout(
        {
          x: orient === "vertical" ? node.x + offset : node.x + node.dx,
          y: orient === "vertical" ? node.y + node.dy : node.y + offset,
        },
        true
      );
      offset += edge.getLayout()[breadthAttr];
    });
    offset = 0;
    node.node.inEdges.forEach((edge) => {
      const passthroughPoints: SankeyPathShape["targets"] = [];
      (edge as GraphLink).passThroughNodeIds.forEach((nodeId) => {
        const passtroughNode = nodes.find((n) => n.id === nodeId)!;
        passthroughPoints.push({
          x: passtroughNode.x,
          y: passtroughNode.y,
          type: curveType,
        });
        if (orient === "vertical") {
          passthroughPoints.push({
            x: passtroughNode.x,
            y: passtroughNode.y + passtroughNode.dy,
            type: "line",
          });
        } else {
          passthroughPoints.push({
            x: passtroughNode.x + passtroughNode.dx,
            y: passtroughNode.y,
            type: "line",
          });
        }
      });
      edge.setLayout(
        {
          targets: [
            ...passthroughPoints,
            {
              x: orient === "vertical" ? node.x + offset : node.x,
              y: orient === "vertical" ? node.y : node.y + offset,
              type: curveType,
            },
          ] as SankeyPathShape["targets"],
        },
        true
      );
      offset += edge.getLayout()[breadthAttr];
    });
  });
}
