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
  computeBarycenter,
  sortNodesInSections,
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
        sourceId: "source",
        targetId: "target",
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
        {
          id: "pt1",
          depth: 1,
          passThrough: true,
          value: 5,
          sourceId: "node1",
          targetId: "node2",
        },
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
        sourceId: "source",
        targetId: "target",
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
      const result = createPassThroughNode("source", "target", 2, 15);

      expect(result).toEqual({
        passThrough: true,
        id: "source-target-2",
        value: 15,
        depth: 2,
        sourceId: "source",
        targetId: "target",
      });
    });
  });

  describe("computeBarycenter", () => {
    it("returns fallback when no neighbor matches", () => {
      const map = new Map<string, number>();
      const result = computeBarycenter([{ id: "unknown", weight: 1 }], map, 3);
      expect(result).toBe(3);
    });

    it("returns fallback when neighbors list is empty", () => {
      const map = new Map([["a", 0]]);
      expect(computeBarycenter([], map, 7)).toBe(7);
    });

    it("computes unweighted average when weights are equal", () => {
      const map = new Map([
        ["a", 0],
        ["b", 2],
      ]);
      const result = computeBarycenter(
        [
          { id: "a", weight: 1 },
          { id: "b", weight: 1 },
        ],
        map,
        0
      );
      expect(result).toBe(1);
    });

    it("lets larger flows pull harder (weighted average)", () => {
      const map = new Map([
        ["small", 0],
        ["big", 4],
      ]);
      const result = computeBarycenter(
        [
          { id: "small", weight: 1 },
          { id: "big", weight: 9 },
        ],
        map,
        0
      );
      expect(result).toBeCloseTo(3.6);
    });

    it("ignores neighbors that are not in the reference section", () => {
      const map = new Map([["a", 2]]);
      const result = computeBarycenter(
        [
          { id: "a", weight: 1 },
          { id: "missing", weight: 5 },
        ],
        map,
        0
      );
      expect(result).toBe(2);
    });
  });

  describe("sortNodesInSections", () => {
    // Minimal mock factories. The barycenter sweep uses:
    //   - node.id
    //   - node.inEdges / node.outEdges
    //   - node.getLayout().depth (via getNodeDepthInfo)
    //   - getRawDataItem for both nodes (for id) and edges (for value)
    interface TestNode {
      id: string;
      depth: number;
      value: number;
      inEdges: TestEdge[];
      outEdges: TestEdge[];
    }
    interface TestEdge {
      source: string;
      target: string;
      value: number;
    }

    // Snapshot the full shape of sortNodesInSections output: every depth, in
    // order, with every node's id. Keeps tests readable while still asserting
    // the entire structure (section count, lengths, and ordering).
    const sectionIds = (
      result: Record<number, { id: string }[]>
    ): Record<number, string[]> =>
      Object.fromEntries(
        Object.entries(result).map(([depth, nodes]) => [
          depth,
          nodes.map((n) => n.id),
        ])
      );

    // Sanity check that sortNodesInSections returns the same node instances,
    // never invents or drops any. Call with the input map used for the sort.
    const expectIdentityPreserved = (
      result: Record<number, { id: string }[]>,
      input: Record<number, { id: string }[]>
    ) => {
      expect(Object.keys(result).sort()).toEqual(Object.keys(input).sort());
      Object.entries(input).forEach(([depth, inputNodes]) => {
        const resultNodes = result[Number(depth)];
        expect(resultNodes).toHaveLength(inputNodes.length);
        // Same set of node references, ignoring order.
        expect(new Set(resultNodes)).toEqual(new Set(inputNodes));
      });
    };

    const buildGraphNode = (testNodes: Record<string, TestNode>) => {
      const nodesById: Record<string, any> = {};
      // First pass: build node shells
      Object.values(testNodes).forEach((t) => {
        nodesById[t.id] = {
          id: t.id,
          dataIndex: 0,
          hostGraph: {
            data: {
              getRawDataItem: () => ({ depth: t.depth, id: t.id }),
            },
          },
          getLayout: () => ({ depth: t.depth, value: t.value }),
          inEdges: [] as any[],
          outEdges: [] as any[],
        };
      });
      // Second pass: wire edges referencing node shells
      Object.values(testNodes).forEach((t) => {
        [...t.inEdges, ...t.outEdges].forEach((e) => {
          const edge = {
            dataIndex: 0,
            node1: nodesById[e.source],
            node2: nodesById[e.target],
            hostGraph: {
              edgeData: { getRawDataItem: () => ({ value: e.value }) },
            },
            getLayout: () => ({ value: e.value }),
          };
          if (t.inEdges.includes(e)) {
            nodesById[t.id].inEdges.push(edge);
          }
          if (t.outEdges.includes(e)) {
            nodesById[t.id].outEdges.push(edge);
          }
        });
      });
      return nodesById;
    };

    it("reorders children to eliminate a crossing (#28764)", () => {
      // Classic crossed-pair: A→a, B→b with children in reversed order.
      // Before sort: 1 crossing. After: 0. The sort must fire.
      const edgeAa = { source: "A", target: "a", value: 1 };
      const edgeBb = { source: "B", target: "b", value: 1 };
      const testNodes: Record<string, TestNode> = {
        A: { id: "A", depth: 0, value: 1, inEdges: [], outEdges: [edgeAa] },
        B: { id: "B", depth: 0, value: 1, inEdges: [], outEdges: [edgeBb] },
        a: { id: "a", depth: 1, value: 1, inEdges: [edgeAa], outEdges: [] },
        b: { id: "b", depth: 1, value: 1, inEdges: [edgeBb], outEdges: [] },
      };
      const graph = buildGraphNode(testNodes);

      const input = {
        0: [graph.A, graph.B],
        1: [graph.b, graph.a],
      };
      const result = sortNodesInSections(input, [0, 1]);

      expect(sectionIds(result)).toEqual({
        0: ["A", "B"],
        1: ["a", "b"],
      });
      expectIdentityPreserved(result, input);
    });

    it("does not reorder when crossings would not decrease", () => {
      // Fully connected pair with no crossing differences possible.
      // Input order should be preserved verbatim.
      const edges = {
        Aa: { source: "A", target: "a", value: 1 },
        Ab: { source: "A", target: "b", value: 1 },
        Ba: { source: "B", target: "a", value: 1 },
        Bb: { source: "B", target: "b", value: 1 },
      };
      const testNodes: Record<string, TestNode> = {
        A: {
          id: "A",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [edges.Aa, edges.Ab],
        },
        B: {
          id: "B",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [edges.Ba, edges.Bb],
        },
        a: {
          id: "a",
          depth: 1,
          value: 2,
          inEdges: [edges.Aa, edges.Ba],
          outEdges: [],
        },
        b: {
          id: "b",
          depth: 1,
          value: 2,
          inEdges: [edges.Ab, edges.Bb],
          outEdges: [],
        },
      };
      const graph = buildGraphNode(testNodes);

      const input = { 0: [graph.B, graph.A], 1: [graph.b, graph.a] };
      const result = sortNodesInSections(input, [0, 1]);

      expect(sectionIds(result)).toEqual({
        0: ["B", "A"],
        1: ["b", "a"],
      });
      expectIdentityPreserved(result, input);
    });

    it("aligns pass-through with its source to eliminate crossings (#30164)", () => {
      // depth 0: A, B
      // depth 1: Achild, Bchild, A→Z passthrough (at end, where
      //   generatePassThroughNodes would append it)
      // depth 2: Z (top of section), Bgrand
      // The sort must move the passthrough up to kill two crossings.
      const edgeAChild = { source: "A", target: "Achild", value: 1 };
      const edgeBChild = { source: "B", target: "Bchild", value: 1 };
      const edgeAZ = { source: "A", target: "Z", value: 1 };
      const edgeBchildGrand = {
        source: "Bchild",
        target: "Bgrand",
        value: 1,
      };
      const testNodes: Record<string, TestNode> = {
        A: {
          id: "A",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [edgeAChild, edgeAZ],
        },
        B: {
          id: "B",
          depth: 0,
          value: 1,
          inEdges: [],
          outEdges: [edgeBChild],
        },
        Achild: {
          id: "Achild",
          depth: 1,
          value: 1,
          inEdges: [edgeAChild],
          outEdges: [],
        },
        Bchild: {
          id: "Bchild",
          depth: 1,
          value: 1,
          inEdges: [edgeBChild],
          outEdges: [edgeBchildGrand],
        },
        Bgrand: {
          id: "Bgrand",
          depth: 2,
          value: 1,
          inEdges: [edgeBchildGrand],
          outEdges: [],
        },
        Z: {
          id: "Z",
          depth: 2,
          value: 1,
          inEdges: [edgeAZ],
          outEdges: [],
        },
      };
      const graph = buildGraphNode(testNodes);
      const passThrough = createPassThroughNode("A", "Z", 1, 1);

      const input = {
        0: [graph.A, graph.B],
        // Input order: real children first, passthrough appended last.
        1: [graph.Achild, graph.Bchild, passThrough],
        2: [graph.Z, graph.Bgrand],
      };
      const result = sortNodesInSections(input, [0, 1, 2]);

      expect(sectionIds(result)).toEqual({
        0: ["A", "B"],
        1: ["Achild", "A-Z-1", "Bchild"],
        2: ["Z", "Bgrand"],
      });
      expectIdentityPreserved(result, input);
      // The passthrough must pass through untouched (not rebuilt).
      expect(result[1][1]).toBe(passThrough);
    });

    it("uses all parents, not just the first link (#51646)", () => {
      // Child has two parents. The first link in input is from the lower
      // parent — a naive first-link sort would place it at the bottom. The
      // barycenter average should keep it near the middle.
      const edgeTopChild = { source: "top", target: "child", value: 1 };
      const edgeBottomChild = { source: "bottom", target: "child", value: 1 };
      const edgeBottomOther = { source: "bottom", target: "other", value: 1 };
      const testNodes: Record<string, TestNode> = {
        top: {
          id: "top",
          depth: 0,
          value: 1,
          inEdges: [],
          outEdges: [edgeTopChild],
        },
        middle: {
          id: "middle",
          depth: 0,
          value: 0,
          inEdges: [],
          outEdges: [],
        },
        bottom: {
          id: "bottom",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [edgeBottomChild, edgeBottomOther],
        },
        child: {
          id: "child",
          depth: 1,
          value: 2,
          inEdges: [edgeBottomChild, edgeTopChild],
          outEdges: [],
        },
        other: {
          id: "other",
          depth: 1,
          value: 1,
          inEdges: [edgeBottomOther],
          outEdges: [],
        },
      };
      const graph = buildGraphNode(testNodes);

      const input = {
        0: [graph.top, graph.middle, graph.bottom],
        1: [graph.other, graph.child],
      };
      const result = sortNodesInSections(input, [0, 1]);

      // child's barycenter = (0 + 2) / 2 = 1; other's = 2. Reordering removes
      // one crossing, so the sort fires.
      expect(sectionIds(result)).toEqual({
        0: ["top", "middle", "bottom"],
        1: ["child", "other"],
      });
      expectIdentityPreserved(result, input);
    });

    it("is idempotent — running twice yields the same order", () => {
      const edgeAC = { source: "A", target: "C", value: 2 };
      const edgeBD = { source: "B", target: "D", value: 1 };
      const testNodes: Record<string, TestNode> = {
        A: { id: "A", depth: 0, value: 2, inEdges: [], outEdges: [edgeAC] },
        B: { id: "B", depth: 0, value: 1, inEdges: [], outEdges: [edgeBD] },
        C: { id: "C", depth: 1, value: 2, inEdges: [edgeAC], outEdges: [] },
        D: { id: "D", depth: 1, value: 1, inEdges: [edgeBD], outEdges: [] },
      };
      const graph = buildGraphNode(testNodes);

      const input = { 0: [graph.A, graph.B], 1: [graph.D, graph.C] };
      const once = sortNodesInSections(input, [0, 1]);
      const twice = sortNodesInSections(once, [0, 1]);

      expect(sectionIds(once)).toEqual({ 0: ["A", "B"], 1: ["C", "D"] });
      expect(sectionIds(twice)).toEqual(sectionIds(once));
      expectIdentityPreserved(once, input);
      expectIdentityPreserved(twice, once);
    });

    it("keeps orphan nodes in their input position", () => {
      const edgeAB = { source: "A", target: "B", value: 1 };
      const testNodes: Record<string, TestNode> = {
        A: { id: "A", depth: 0, value: 1, inEdges: [], outEdges: [edgeAB] },
        orphan: {
          id: "orphan",
          depth: 0,
          value: 1,
          inEdges: [],
          outEdges: [],
        },
        B: { id: "B", depth: 1, value: 1, inEdges: [edgeAB], outEdges: [] },
      };
      const graph = buildGraphNode(testNodes);

      const input = { 0: [graph.A, graph.orphan], 1: [graph.B] };
      const result = sortNodesInSections(input, [0, 1]);

      // Orphan has no neighbors on either side, so it stays in place.
      expect(sectionIds(result)).toEqual({
        0: ["A", "orphan"],
        1: ["B"],
      });
      expectIdentityPreserved(result, input);
    });
  });
});
