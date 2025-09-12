import { describe, it, expect } from "vitest";
import type { GraphEdge, GraphNode } from "echarts/types/src/data/Graph";
import {
  getCoordinateSystem,
  isPassThroughNode,
  calculateSectionDimensions,
  groupNodesBySection,
  createSectionNodes,
  setNodeSizes,
  getNodeDepthInfo,
  getEdgeValue,
  getPassThroughSections,
  createPassThroughNode,
} from "../../../../../src/resources/echarts/components/sankey/sankey-layout";

// Mock types for testing
interface MockGraphNode {
  id: string;
  hostGraph: {
    data: {
      getRawDataItem: (index: number) => { depth?: number; id?: string };
    };
  };
  dataIndex: number;
  getLayout: () => { depth?: number; value: number };
}

interface MockGraphEdge {
  getLayout: () => { value: number };
  hostGraph: {
    edgeData: {
      getRawDataItem: (index: number) => { value?: number };
    };
  };
  dataIndex: number;
  node1: MockGraphNode;
  node2: MockGraphNode;
}

describe("Sankey Layout Functions", () => {
  describe("getCoordinateSystem", () => {
    it("should return vertical coordinate system for vertical orientation", () => {
      const coords = getCoordinateSystem("vertical");
      expect(coords).toEqual({
        breadth: "x",
        depth: "y",
        breadthSize: "dx",
        depthSize: "dy",
      });
    });

    it("should return horizontal coordinate system for horizontal orientation", () => {
      const coords = getCoordinateSystem("horizontal");
      expect(coords).toEqual({
        breadth: "y",
        depth: "x",
        breadthSize: "dy",
        depthSize: "dx",
      });
    });
  });

  describe("isPassThroughNode", () => {
    it("should return true for pass-through nodes", () => {
      const passThroughNode = {
        passThrough: true,
        id: "test",
        value: 10,
        depth: 1,
      };
      expect(isPassThroughNode(passThroughNode)).toBe(true);
    });

    it("should return false for regular nodes", () => {
      const regularNode = {
        id: "test",
        getLayout: () => ({ value: 10, depth: 1 }),
      };
      expect(isPassThroughNode(regularNode as GraphNode)).toBe(false);
    });
  });

  describe("calculateSectionDimensions", () => {
    it("should calculate dimensions for vertical orientation", () => {
      const result = calculateSectionDimensions(
        "vertical",
        800,
        600,
        [0, 1, 2],
        10
      );
      expect(result.sectionSize).toBe(780); // 800 - 10 * 2
      expect(result.sectionDepthSize).toBe(200); // 600 / 3
    });

    it("should calculate dimensions for horizontal orientation", () => {
      const result = calculateSectionDimensions(
        "horizontal",
        800,
        600,
        [0, 1, 2],
        10
      );
      expect(result.sectionSize).toBe(580); // 600 - 10 * 2
      expect(result.sectionDepthSize).toBe(266.6666666666667); // 800 / 3
    });
  });

  describe("groupNodesBySection", () => {
    it("should group nodes by their depth", () => {
      const mockNodes: MockGraphNode[] = [
        {
          id: "node1",
          dataIndex: 0,
          hostGraph: {
            data: {
              getRawDataItem: () => ({ depth: 0 }),
            },
          },
          getLayout: () => ({ depth: 0, value: 10 }),
        },
        {
          id: "node2",
          dataIndex: 1,
          hostGraph: {
            data: {
              getRawDataItem: () => ({ depth: 1 }),
            },
          },
          getLayout: () => ({ depth: 1, value: 20 }),
        },
        {
          id: "node3",
          dataIndex: 2,
          hostGraph: {
            data: {
              getRawDataItem: () => ({ depth: 0 }),
            },
          },
          getLayout: () => ({ depth: 0, value: 15 }),
        },
      ];

      const passThroughNodes = [
        { id: "pt1", depth: 1, passThrough: true, value: 5 },
      ];

      const result = groupNodesBySection(
        mockNodes as GraphNode[],
        passThroughNodes
      );

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].id).toBe("node1");
      expect(result[0][1].id).toBe("node3");
      expect(result[1]).toHaveLength(2);
      expect(result[1][0].id).toBe("node2");
      expect(result[1][1].id).toBe("pt1");
    });
  });

  describe("createSectionNodes", () => {
    it("should create section nodes from graph nodes", () => {
      const mockNodes: MockGraphNode[] = [
        {
          id: "node1",
          dataIndex: 0,
          hostGraph: {
            data: {
              getRawDataItem: () => ({}),
            },
          },
          getLayout: () => ({ value: 10 }),
        },
      ];

      const result = createSectionNodes(mockNodes as GraphNode[]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        node: mockNodes[0],
        id: "node1",
        value: 10,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        size: 0,
      });
    });

    it("should handle pass-through nodes", () => {
      const passThroughNode = {
        id: "pt1",
        passThrough: true,
        value: 5,
        depth: 1,
      };

      const result = createSectionNodes([passThroughNode]);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(5);
    });
  });

  describe("setNodeSizes", () => {
    it("should calculate node sizes correctly", () => {
      const nodes = [
        { value: 10, size: 0 } as any,
        { value: 20, size: 0 } as any,
        { value: 30, size: 0 } as any,
      ];

      const result = setNodeSizes(nodes, 50, 60);

      expect(result.nodes[0].size).toBe(8); // floor(10 / (60/50)) = floor(10 / 1.2) = 8
      expect(result.nodes[1].size).toBe(16); // floor(20 / 1.2) = 16.67 -> 16
      expect(result.nodes[2].size).toBe(25); // floor(30 / 1.2) = 25
      expect(result.valueToSizeRatio).toBe(1.2);
    });

    it("should enforce minimum size", () => {
      const nodes = [{ value: 0.1, size: 0 } as any];

      const result = setNodeSizes(nodes, 50, 5);

      expect(result.nodes[0].size).toBe(1); // Minimum size
    });

    it("should handle deficit adjustment", () => {
      const nodes = [
        { value: 1, size: 0 } as any,
        { value: 1, size: 0 } as any,
      ];

      const result = setNodeSizes(nodes, 5, 2);

      expect(result.nodes[0].size).toBe(2); // floor(1 / (2/5)) = floor(1 / 0.4) = 2
      expect(result.nodes[1].size).toBe(2); // floor(1 / 0.4) = 2
    });
  });

  describe("getNodeDepthInfo", () => {
    it("should extract depth information from graph node", () => {
      const mockNode: MockGraphNode = {
        id: "test",
        dataIndex: 0,
        hostGraph: {
          data: {
            getRawDataItem: () => ({ depth: 2 }),
          },
        },
        getLayout: () => ({ depth: 2, value: 10 }),
      };

      const result = getNodeDepthInfo(mockNode as GraphNode, [0, 1, 2]);

      expect(result.depth).toBe(2);
      expect(result.depthIndex).toBe(2);
    });

    it("should default to depth 0 when not specified", () => {
      const mockNode: MockGraphNode = {
        id: "test",
        dataIndex: 0,
        hostGraph: {
          data: {
            getRawDataItem: () => ({}),
          },
        },
        getLayout: () => ({ depth: 0, value: 10 }),
      };

      const result = getNodeDepthInfo(mockNode as GraphNode, [0, 1, 2]);

      expect(result.depth).toBe(0);
      expect(result.depthIndex).toBe(0);
    });
  });

  describe("getEdgeValue", () => {
    it("should extract value from edge", () => {
      const mockEdge: MockGraphEdge = {
        getLayout: () => ({ value: 15 }),
        hostGraph: {
          edgeData: {
            getRawDataItem: () => ({ value: 25 }),
          },
        },
        dataIndex: 0,
        node1: {} as any,
        node2: {} as any,
      };

      const result = getEdgeValue(mockEdge as GraphEdge);
      expect(result).toBe(25);
    });
  });

  describe("getPassThroughSections", () => {
    it("should return sections between source and target depths", () => {
      const depths = [0, 1, 2, 3, 4];
      const result = getPassThroughSections(1, 3, depths);

      expect(result).toEqual([2]);
    });

    it("should return empty array when no sections needed", () => {
      const depths = [0, 1, 2];
      const result = getPassThroughSections(0, 1, depths);

      expect(result).toEqual([]);
    });
  });

  describe("createPassThroughNode", () => {
    it("should create a pass-through node", () => {
      const result = createPassThroughNode("source-target", "section1", 2, 15);

      expect(result).toEqual({
        passThrough: true,
        id: "source-target-section1-2",
        value: 15,
        depth: 2,
      });
    });
  });
});
