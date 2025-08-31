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

export function isPassThroughNode(node: Node): node is PassThroughNode {
  return "passThrough" in node;
}

const MIN_SIZE = 1;

interface CoordinateSystem {
  breadth: "x" | "y";
  depth: "x" | "y";
  breadthSize: "dx" | "dy";
  depthSize: "dx" | "dy";
}

export function getCoordinateSystem(
  orient: "vertical" | "horizontal"
): CoordinateSystem {
  return orient === "vertical"
    ? { breadth: "x", depth: "y", breadthSize: "dx", depthSize: "dy" }
    : { breadth: "y", depth: "x", breadthSize: "dy", depthSize: "dx" };
}

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

export function getNodeDepthInfo(
  node: GraphNode,
  depths: number[]
): { depth: number; depthIndex: number } {
  const nodeItem = node.hostGraph.data.getRawDataItem(
    node.dataIndex
  ) as SankeyNodeItemOption;
  const depth = nodeItem.depth || 0;
  const depthIndex = depths.findIndex((i) => i === depth);
  return { depth, depthIndex };
}

export function getEdgeValue(edge: GraphEdge): number {
  const edgeItem = edge.hostGraph.edgeData.getRawDataItem(
    edge.dataIndex
  ) as SankeyEdgeItemOption;
  return edgeItem.value as number;
}

export function getPassThroughSections(
  sourceDepthIndex: number,
  targetDepthIndex: number,
  depths: number[]
): number[] {
  return depths.slice(sourceDepthIndex + 1, targetDepthIndex);
}

export function createPassThroughNode(
  sourceId: string,
  targetId: string,
  depth: number,
  value: number
): PassThroughNode {
  return {
    passThrough: true,
    id: `${sourceId}-${targetId}-${depth}`,
    value,
    depth,
  };
}

function processEdgeForPassThrough(
  edge: GraphEdge,
  depths: number[],
  passThroughNodes: PassThroughNode[]
): string[] {
  if (edge.getLayout().value === 0) {
    return [];
  }

  const sourceInfo = getNodeDepthInfo(edge.node1, depths);
  const targetInfo = getNodeDepthInfo(edge.node2, depths);
  const edgeValue = getEdgeValue(edge);

  const passThroughSections = getPassThroughSections(
    sourceInfo.depthIndex,
    targetInfo.depthIndex,
    depths
  );

  const sourceNode = edge.node1.hostGraph.data.getRawDataItem(
    edge.node1.dataIndex
  ) as SankeyNodeItemOption;
  const targetNode = edge.node2.hostGraph.data.getRawDataItem(
    edge.node2.dataIndex
  ) as SankeyNodeItemOption;

  const passThroughNodeIds = passThroughSections.map((depth) => {
    const node = createPassThroughNode(
      sourceNode.id as string,
      targetNode.id as string,
      depth,
      edgeValue
    );
    passThroughNodes.push(node);
    return node.id;
  });

  return passThroughNodeIds;
}

function generatePassThroughNodes(depths: number[], edges: GraphEdge[]) {
  const passThroughNodes: PassThroughNode[] = [];

  edges.forEach((edge) => {
    const passThroughNodeIds = processEdgeForPassThrough(
      edge,
      depths,
      passThroughNodes
    );
    const link = edge as GraphLink;
    link.passThroughNodeIds = passThroughNodeIds;
  });

  return passThroughNodes;
}

export function groupNodesBySection(
  nodes: GraphNode[],
  passThroughNodes: PassThroughNode[]
): Record<number, Node[]> {
  const nodesPerSection: Record<number, Node[]> = {};

  nodes.forEach((node) => {
    const depth = node.getLayout().depth;
    if (!nodesPerSection[depth]) {
      nodesPerSection[depth] = [node];
    } else {
      nodesPerSection[depth].push(node);
    }
  });

  passThroughNodes.forEach((node) => {
    if (!nodesPerSection[node.depth]) {
      nodesPerSection[node.depth] = [node];
    } else {
      nodesPerSection[node.depth].push(node);
    }
  });

  return nodesPerSection;
}

export function createSectionNodes(nodes: Node[]): SectionNode[] {
  return nodes.map(
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
}

export function calculateSectionDimensions(
  orient: "vertical" | "horizontal",
  width: number,
  height: number,
  depths: number[],
  nodeGap: number
) {
  const sectionSize = (orient === "vertical" ? width : height) - nodeGap * 2;
  const sectionDepthSize =
    orient === "vertical" ? height / depths.length : width / depths.length;

  return { sectionSize, sectionDepthSize };
}

/**
 * Basically does `align-items: space-around`
 * @param section - The section to position nodes in
 * @param index - The index of the section
 * @param sectionSize - The size of the section
 * @param sectionDepthSize - The depth size of the section
 * @param globalValueToSizeRatio - The global value to size ratio
 * @param orient - The orientation of the section (vertical or horizontal)
 */
function positionNodesInSection(
  section: {
    nodes: SectionNode[];
    depth: number;
    totalValue: number;
    valueToSizeRatio: number;
  },
  index: number,
  sectionSize: number,
  sectionDepthSize: number,
  globalValueToSizeRatio: number,
  orient: "vertical" | "horizontal"
) {
  let totalSize = 0;

  if (section.valueToSizeRatio !== globalValueToSizeRatio) {
    section.nodes.forEach((node) => {
      const size = Math.max(
        MIN_SIZE,
        Math.floor(node.value / globalValueToSizeRatio)
      );
      totalSize += size;
      node.size = size;
    });
  } else {
    totalSize = section.nodes.reduce((sum, node) => sum + node.size, 0);
  }

  const emptySpace = sectionSize - totalSize;
  let offset = emptySpace / (section.nodes.length + 1);

  section.nodes.forEach((node) => {
    if (orient === "vertical") {
      node.x = offset;
      node.y = index * sectionDepthSize;
    } else {
      node.x = index * sectionDepthSize;
      node.y = offset;
    }
    offset += node.size + emptySpace / (section.nodes.length + 1);
  });
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
  const { sectionSize, sectionDepthSize } = calculateSectionDimensions(
    orient,
    width,
    height,
    depths,
    nodeGap
  );

  const nodesPerSection = groupNodesBySection(nodes, passThroughNodes);
  let globalValueToSizeRatio = 0;

  const sections = depths.map((depth) => {
    const sectionNodes = createSectionNodes(nodesPerSection[depth] || []);
    const availableSpace = sectionSize - (sectionNodes.length + 1) * nodeGap;
    const totalValue = sectionNodes.reduce(
      (acc: number, node: SectionNode) => acc + node.value,
      0
    );
    const { nodes: sizedNodes, valueToSizeRatio: sectionValueToSizeRatio } =
      setNodeSizes(
        sectionNodes,
        availableSpace,
        totalValue,
        globalValueToSizeRatio
      );

    if (sectionValueToSizeRatio > globalValueToSizeRatio) {
      globalValueToSizeRatio = sectionValueToSizeRatio;
    }

    return {
      nodes: sizedNodes,
      depth,
      totalValue,
      valueToSizeRatio: sectionValueToSizeRatio,
    };
  });

  sections.forEach((section, index) => {
    positionNodesInSection(
      section,
      index,
      sectionSize,
      sectionDepthSize,
      globalValueToSizeRatio,
      orient
    );
  });

  return sections.flatMap((section) => section.nodes);
}

export function setNodeSizes(
  nodes: SectionNode[],
  availableSpace: number,
  totalValue: number,
  prevValueToSizeRatio = 0
): { nodes: SectionNode[]; valueToSizeRatio: number } {
  let valueToSizeRatio = totalValue / availableSpace;
  if (valueToSizeRatio < prevValueToSizeRatio) {
    valueToSizeRatio = prevValueToSizeRatio;
  }
  let deficitHeight = 0;
  const result = nodes.map((node) => {
    if (node.size === MIN_SIZE) {
      return node;
    }
    let size = Math.floor(node.value / valueToSizeRatio);
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
      valueToSizeRatio
    );
  }
  return { nodes: result, valueToSizeRatio };
}

function applyNodeDimensions(
  nodes: SectionNode[],
  nodeWidth: number,
  coords: CoordinateSystem
) {
  nodes.forEach((node) => {
    node[coords.breadthSize] = node.size;
    node[coords.depthSize] = nodeWidth;
    if (isPassThroughNode(node.node)) {
      return;
    }
    node.node.setLayout(
      { x: node.x, y: node.y, dx: node.dx, dy: node.dy },
      true
    );
  });
}

function applyEdgeSizes(nodes: SectionNode[], coords: CoordinateSystem) {
  nodes.forEach((node) => {
    if (isPassThroughNode(node.node)) {
      return;
    }
    node.node.outEdges.forEach((edge) => {
      const edgeItem = edge.hostGraph.edgeData.getRawDataItem(
        edge.dataIndex
      ) as SankeyEdgeItemOption;
      const edgeSize = ((edgeItem.value as number) / node.value) * node.size;
      edge.setLayout(
        { [coords.breadthSize]: edgeSize, [coords.depthSize]: 0 },
        true
      );
    });
  });
}

function sortEdgesByTargetPosition(
  nodes: SectionNode[],
  coords: CoordinateSystem
) {
  nodes.forEach((node) => {
    if (isPassThroughNode(node.node)) {
      return;
    }
    node.node.outEdges.sort(
      (a, b) =>
        a.node2.getLayout()[coords.breadth] -
        b.node2.getLayout()[coords.breadth]
    );
    node.node.inEdges.sort(
      (a, b) =>
        a.node1.getLayout()[coords.breadth] -
        b.node1.getLayout()[coords.breadth]
    );
  });
}

function generatePassThroughPoints(
  edge: GraphLink,
  nodes: SectionNode[],
  orient: "vertical" | "horizontal",
  curveType: "curveVertical" | "curveHorizontal"
): SankeyPathShape["targets"] {
  const passthroughPoints: SankeyPathShape["targets"] = [];

  edge.passThroughNodeIds.forEach((nodeId) => {
    const passthroughNode = nodes.find((n) => n.id === nodeId)!;
    passthroughPoints.push({
      x: passthroughNode.x,
      y: passthroughNode.y,
      type: curveType,
    });

    if (orient === "vertical") {
      passthroughPoints.push({
        x: passthroughNode.x,
        y: passthroughNode.y + passthroughNode.dy,
        type: "line",
      });
    } else {
      passthroughPoints.push({
        x: passthroughNode.x + passthroughNode.dx,
        y: passthroughNode.y,
        type: "line",
      });
    }
  });

  return passthroughPoints;
}

function positionOutEdges(
  node: SectionNode,
  orient: "vertical" | "horizontal",
  coords: CoordinateSystem
) {
  if (isPassThroughNode(node.node)) {
    return;
  }
  let offset = 0;
  node.node.outEdges.forEach((edge) => {
    edge.setLayout(
      {
        x: orient === "vertical" ? node.x + offset : node.x + node.dx,
        y: orient === "vertical" ? node.y + node.dy : node.y + offset,
      },
      true
    );
    offset += edge.getLayout()[coords.breadthSize];
  });
}

function positionInEdges(
  node: SectionNode,
  nodes: SectionNode[],
  orient: "vertical" | "horizontal",
  coords: CoordinateSystem,
  curveType: "curveVertical" | "curveHorizontal"
) {
  if (isPassThroughNode(node.node)) {
    return;
  }
  let offset = 0;
  node.node.inEdges.forEach((edge) => {
    const passthroughPoints = generatePassThroughPoints(
      edge as GraphLink,
      nodes,
      orient,
      curveType
    );

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
    offset += edge.getLayout()[coords.breadthSize];
  });
}

function applyLayout(
  nodes: SectionNode[],
  nodeWidth: number,
  orient: "vertical" | "horizontal"
) {
  const coords = getCoordinateSystem(orient);
  const curveType = orient === "vertical" ? "curveVertical" : "curveHorizontal";

  applyNodeDimensions(nodes, nodeWidth, coords);
  applyEdgeSizes(nodes, coords);
  sortEdgesByTargetPosition(nodes, coords);

  nodes.forEach((node) => {
    if (isPassThroughNode(node.node)) {
      return;
    }
    positionOutEdges(node, orient, coords);
    positionInEdges(node, nodes, orient, coords, curveType);
  });
}
