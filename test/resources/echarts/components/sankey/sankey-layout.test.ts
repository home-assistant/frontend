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
  dominantNeighborIndex,
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

    const buildGraph = (testNodes: Record<string, TestNode>) => {
      const nodesById: Record<string, any> = {};
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
      // Create one canonical edge object per TestEdge reference, then wire it
      // into both source.outEdges and target.inEdges so they point at the same
      // object (matching echarts' Graph shape).
      const edgeByTestEdge = new Map<TestEdge, any>();
      Object.values(testNodes).forEach((t) => {
        [...t.inEdges, ...t.outEdges].forEach((e) => {
          if (!edgeByTestEdge.has(e)) {
            edgeByTestEdge.set(e, {
              dataIndex: 0,
              node1: nodesById[e.source],
              node2: nodesById[e.target],
              hostGraph: {
                edgeData: { getRawDataItem: () => ({ value: e.value }) },
              },
              getLayout: () => ({ value: e.value }),
            });
          }
        });
      });
      Object.values(testNodes).forEach((t) => {
        t.inEdges.forEach((e) =>
          nodesById[t.id].inEdges.push(edgeByTestEdge.get(e))
        );
        t.outEdges.forEach((e) =>
          nodesById[t.id].outEdges.push(edgeByTestEdge.get(e))
        );
      });
      return { nodes: nodesById, edges: [...edgeByTestEdge.values()] };
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
      const { nodes: graph, edges } = buildGraph(testNodes);

      const input = {
        0: [graph.A, graph.B],
        1: [graph.b, graph.a],
      };
      const result = sortNodesInSections(input, [0, 1], edges);

      expect(sectionIds(result)).toEqual({
        0: ["A", "B"],
        1: ["a", "b"],
      });
      expectIdentityPreserved(result, input);
    });

    it("does not reorder when crossings would not decrease", () => {
      // Fully connected pair with no crossing differences possible.
      // Input order should be preserved verbatim.
      const e = {
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
          outEdges: [e.Aa, e.Ab],
        },
        B: {
          id: "B",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [e.Ba, e.Bb],
        },
        a: {
          id: "a",
          depth: 1,
          value: 2,
          inEdges: [e.Aa, e.Ba],
          outEdges: [],
        },
        b: {
          id: "b",
          depth: 1,
          value: 2,
          inEdges: [e.Ab, e.Bb],
          outEdges: [],
        },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);

      const input = { 0: [graph.B, graph.A], 1: [graph.b, graph.a] };
      const result = sortNodesInSections(input, [0, 1], edges);

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
      const { nodes: graph, edges } = buildGraph(testNodes);
      const passThrough = createPassThroughNode("A", "Z", 1, 1);

      const input = {
        0: [graph.A, graph.B],
        // Input order: real children first, passthrough appended last.
        1: [graph.Achild, graph.Bchild, passThrough],
        2: [graph.Z, graph.Bgrand],
      };
      const result = sortNodesInSections(input, [0, 1, 2], edges);

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
      const { nodes: graph, edges } = buildGraph(testNodes);

      const input = {
        0: [graph.top, graph.middle, graph.bottom],
        1: [graph.other, graph.child],
      };
      const result = sortNodesInSections(input, [0, 1], edges);

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
      const { nodes: graph, edges } = buildGraph(testNodes);

      const input = { 0: [graph.A, graph.B], 1: [graph.D, graph.C] };
      const once = sortNodesInSections(input, [0, 1], edges);
      const twice = sortNodesInSections(once, [0, 1], edges);

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
      const { nodes: graph, edges } = buildGraph(testNodes);

      const input = { 0: [graph.A, graph.orphan], 1: [graph.B] };
      const result = sortNodesInSections(input, [0, 1], edges);

      // Orphan has no neighbors on either side, so it stays in place.
      expect(sectionIds(result)).toEqual({
        0: ["A", "orphan"],
        1: ["B"],
      });
      expectIdentityPreserved(result, input);
    });

    it("untangles a plateau-trapped subtree to remove an avoidable crossing (#52852)", () => {
      // Realistic consumption tree: home → floors → areas → devices, plus two
      // devices that attach higher up — one on a floor with no area
      // (dev_floor_outside) and one straight on home (dev_home) — which the
      // engine threads through with pass-throughs. The seed splits
      // floor_outside's subtree: its pass-through child sits *after*
      // floor_foundation's area. Pulling it back trades a crossing from the
      // (1,2) boundary to the (2,3) boundary — a net-zero "plateau" the old
      // strict gate refused, leaving the crossing. The plateau-escape must now
      // take that step and let the device section follow, reaching 0 crossings.
      const e = {
        homeFo: { source: "home", target: "floor_outside", value: 1 },
        homeFf: { source: "home", target: "floor_foundation", value: 1 },
        foHvac: { source: "floor_outside", target: "area_hvac", value: 1 },
        ffParking: {
          source: "floor_foundation",
          target: "area_parking",
          value: 1,
        },
        hvacDev: { source: "area_hvac", target: "dev_hvac", value: 1 },
        parkingDev: { source: "area_parking", target: "dev_parking", value: 1 },
        foDev: {
          source: "floor_outside",
          target: "dev_floor_outside",
          value: 1,
        },
        homeDev: { source: "home", target: "dev_home", value: 1 },
      };
      const testNodes: Record<string, TestNode> = {
        home: {
          id: "home",
          depth: 0,
          value: 4,
          inEdges: [],
          outEdges: [e.homeFo, e.homeFf, e.homeDev],
        },
        floor_outside: {
          id: "floor_outside",
          depth: 1,
          value: 2,
          inEdges: [e.homeFo],
          outEdges: [e.foHvac, e.foDev],
        },
        floor_foundation: {
          id: "floor_foundation",
          depth: 1,
          value: 1,
          inEdges: [e.homeFf],
          outEdges: [e.ffParking],
        },
        area_hvac: {
          id: "area_hvac",
          depth: 2,
          value: 1,
          inEdges: [e.foHvac],
          outEdges: [e.hvacDev],
        },
        area_parking: {
          id: "area_parking",
          depth: 2,
          value: 1,
          inEdges: [e.ffParking],
          outEdges: [e.parkingDev],
        },
        dev_hvac: {
          id: "dev_hvac",
          depth: 3,
          value: 1,
          inEdges: [e.hvacDev],
          outEdges: [],
        },
        dev_parking: {
          id: "dev_parking",
          depth: 3,
          value: 1,
          inEdges: [e.parkingDev],
          outEdges: [],
        },
        dev_floor_outside: {
          id: "dev_floor_outside",
          depth: 3,
          value: 1,
          inEdges: [e.foDev],
          outEdges: [],
        },
        dev_home: {
          id: "dev_home",
          depth: 3,
          value: 1,
          inEdges: [e.homeDev],
          outEdges: [],
        },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const ptHome1 = createPassThroughNode("home", "dev_home", 1, 1);
      const ptFo2 = createPassThroughNode(
        "floor_outside",
        "dev_floor_outside",
        2,
        1
      );
      const ptHome2 = createPassThroughNode("home", "dev_home", 2, 1);

      // Seed order from ha-sankey-chart: pass-throughs appended after the real
      // children, so floor_outside's subtree is broken across the section.
      const input = {
        0: [graph.home],
        1: [graph.floor_outside, graph.floor_foundation, ptHome1],
        2: [graph.area_hvac, graph.area_parking, ptFo2, ptHome2],
        3: [
          graph.dev_hvac,
          graph.dev_parking,
          graph.dev_floor_outside,
          graph.dev_home,
        ],
      };
      const result = sortNodesInSections(input, [0, 1, 2, 3], edges);

      // floor_outside's children (area_hvac and its pass-through) are now
      // contiguous, ahead of floor_foundation's; the layout is crossing-free.
      expect(sectionIds(result)).toEqual({
        0: ["home"],
        1: ["floor_outside", "floor_foundation", "home-dev_home-1"],
        2: [
          "area_hvac",
          "floor_outside-dev_floor_outside-2",
          "area_parking",
          "home-dev_home-2",
        ],
        3: ["dev_hvac", "dev_floor_outside", "dev_parking", "dev_home"],
      });
      expectIdentityPreserved(result, input);

      // Re-running on the result must not drift: plateau churn is discarded and
      // the best snapshot is returned, so the order is stable (idempotent).
      const again = sortNodesInSections(result, [0, 1, 2, 3], edges);
      expect(sectionIds(again)).toEqual(sectionIds(result));
    });

    it("groups single-parent siblings under their parent and keeps configured sibling order", () => {
      // Two floors, two areas each, fed to the engine interleaved (not grouped
      // by floor). The deterministic hierarchy pass must regroup areas under
      // their floor, and within a floor preserve the configured (seed) order:
      // a1 before a2, b1 before b2.
      const e = {
        hFa: { source: "home", target: "floor_a", value: 2 },
        hFb: { source: "home", target: "floor_b", value: 2 },
        faA1: { source: "floor_a", target: "a1", value: 1 },
        faA2: { source: "floor_a", target: "a2", value: 1 },
        fbB1: { source: "floor_b", target: "b1", value: 1 },
        fbB2: { source: "floor_b", target: "b2", value: 1 },
      };
      const testNodes: Record<string, TestNode> = {
        home: {
          id: "home",
          depth: 0,
          value: 4,
          inEdges: [],
          outEdges: [e.hFa, e.hFb],
        },
        floor_a: {
          id: "floor_a",
          depth: 1,
          value: 2,
          inEdges: [e.hFa],
          outEdges: [e.faA1, e.faA2],
        },
        floor_b: {
          id: "floor_b",
          depth: 1,
          value: 2,
          inEdges: [e.hFb],
          outEdges: [e.fbB1, e.fbB2],
        },
        a1: { id: "a1", depth: 2, value: 1, inEdges: [e.faA1], outEdges: [] },
        a2: { id: "a2", depth: 2, value: 1, inEdges: [e.faA2], outEdges: [] },
        b1: { id: "b1", depth: 2, value: 1, inEdges: [e.fbB1], outEdges: [] },
        b2: { id: "b2", depth: 2, value: 1, inEdges: [e.fbB2], outEdges: [] },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const input = {
        0: [graph.home],
        1: [graph.floor_a, graph.floor_b],
        2: [graph.a1, graph.b1, graph.a2, graph.b2], // interleaved
      };
      const result = sortNodesInSections(input, [0, 1, 2], edges);

      expect(sectionIds(result)).toEqual({
        0: ["home"],
        1: ["floor_a", "floor_b"],
        2: ["a1", "a2", "b1", "b2"],
      });
      expectIdentityPreserved(result, input);
    });

    it("orders a single-parent section by parent position, ignoring flow magnitude", () => {
      // childB carries a far larger flow than childA, but a single-parent
      // section is ordered by parent position (hierarchy), never by value.
      const edgeACa = { source: "A", target: "childA", value: 1 };
      const edgeBCb = { source: "B", target: "childB", value: 100 };
      const testNodes: Record<string, TestNode> = {
        A: { id: "A", depth: 0, value: 1, inEdges: [], outEdges: [edgeACa] },
        B: { id: "B", depth: 0, value: 100, inEdges: [], outEdges: [edgeBCb] },
        childA: {
          id: "childA",
          depth: 1,
          value: 1,
          inEdges: [edgeACa],
          outEdges: [],
        },
        childB: {
          id: "childB",
          depth: 1,
          value: 100,
          inEdges: [edgeBCb],
          outEdges: [],
        },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const input = { 0: [graph.A, graph.B], 1: [graph.childB, graph.childA] };
      const result = sortNodesInSections(input, [0, 1], edges);

      expect(sectionIds(result)).toEqual({
        0: ["A", "B"],
        1: ["childA", "childB"],
      });
      expectIdentityPreserved(result, input);
    });

    it("keeps the single-parent tree hierarchical below a multi-parent source layer", () => {
      // grid + solar feed home (a genuine multi-parent section that stays under
      // the barycenter sweep); the floor/area tree below is single-parent and
      // must regroup by parent regardless of the multi-parent head.
      const e = {
        gH: { source: "grid", target: "home", value: 2 },
        sH: { source: "solar", target: "home", value: 2 },
        hFa: { source: "home", target: "floor_a", value: 2 },
        hFb: { source: "home", target: "floor_b", value: 2 },
        faA: { source: "floor_a", target: "area_a", value: 2 },
        fbB: { source: "floor_b", target: "area_b", value: 2 },
      };
      const testNodes: Record<string, TestNode> = {
        grid: { id: "grid", depth: 0, value: 2, inEdges: [], outEdges: [e.gH] },
        solar: {
          id: "solar",
          depth: 0,
          value: 2,
          inEdges: [],
          outEdges: [e.sH],
        },
        home: {
          id: "home",
          depth: 1,
          value: 4,
          inEdges: [e.gH, e.sH],
          outEdges: [e.hFa, e.hFb],
        },
        floor_a: {
          id: "floor_a",
          depth: 2,
          value: 2,
          inEdges: [e.hFa],
          outEdges: [e.faA],
        },
        floor_b: {
          id: "floor_b",
          depth: 2,
          value: 2,
          inEdges: [e.hFb],
          outEdges: [e.fbB],
        },
        area_a: {
          id: "area_a",
          depth: 3,
          value: 2,
          inEdges: [e.faA],
          outEdges: [],
        },
        area_b: {
          id: "area_b",
          depth: 3,
          value: 2,
          inEdges: [e.fbB],
          outEdges: [],
        },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const input = {
        0: [graph.grid, graph.solar],
        1: [graph.home],
        2: [graph.floor_a, graph.floor_b],
        3: [graph.area_b, graph.area_a], // reversed; must regroup under floors
      };
      const result = sortNodesInSections(input, [0, 1, 2, 3], edges);

      expect(sectionIds(result)).toEqual({
        0: ["grid", "solar"],
        1: ["home"],
        2: ["floor_a", "floor_b"],
        3: ["area_a", "area_b"],
      });
      expectIdentityPreserved(result, input);
    });

    it("regroups single-parent children after a multi-parent head is reordered (idempotent)", () => {
      // A multi-parent head section [H0,H1,H2] (only H1 draws from two sources)
      // gets reordered by the barycenter sweep. Its single-parent children must
      // then be regrouped under the *settled* head — H1's children before H2's
      // child — and the result must be idempotent. Before the head/tree passes
      // were ordered correctly the children stayed grouped against the head's
      // SEED order, which both mis-grouped them and broke f(f(x)) === f(x).
      const e = {
        s0h0: { source: "S0", target: "H0", value: 6 },
        s0h1: { source: "S0", target: "H1", value: 7 },
        s1h1: { source: "S1", target: "H1", value: 5 },
        s2h2: { source: "S2", target: "H2", value: 6 },
        h1d0: { source: "H1", target: "D0", value: 7 },
        h1d2: { source: "H1", target: "D2", value: 9 },
        h2d1: { source: "H2", target: "D1", value: 7 },
      };
      const testNodes: Record<string, TestNode> = {
        S0: {
          id: "S0",
          depth: 0,
          value: 13,
          inEdges: [],
          outEdges: [e.s0h0, e.s0h1],
        },
        S1: { id: "S1", depth: 0, value: 5, inEdges: [], outEdges: [e.s1h1] },
        S2: { id: "S2", depth: 0, value: 6, inEdges: [], outEdges: [e.s2h2] },
        H0: { id: "H0", depth: 1, value: 6, inEdges: [e.s0h0], outEdges: [] },
        H1: {
          id: "H1",
          depth: 1,
          value: 12,
          inEdges: [e.s1h1, e.s0h1],
          outEdges: [e.h1d0, e.h1d2],
        },
        H2: {
          id: "H2",
          depth: 1,
          value: 6,
          inEdges: [e.s2h2],
          outEdges: [e.h2d1],
        },
        D0: { id: "D0", depth: 2, value: 7, inEdges: [e.h1d0], outEdges: [] },
        D1: { id: "D1", depth: 2, value: 7, inEdges: [e.h2d1], outEdges: [] },
        D2: { id: "D2", depth: 2, value: 9, inEdges: [e.h1d2], outEdges: [] },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const input = {
        0: [graph.S0, graph.S1, graph.S2],
        1: [graph.H2, graph.H1, graph.H0],
        2: [graph.D1, graph.D2, graph.D0],
      };
      const result = sortNodesInSections(input, [0, 1, 2], edges);

      // Head settles to barycenter order [H0,H1,H2]; children regroup under it:
      // H1's children (D2,D0) precede H2's child (D1).
      expect(sectionIds(result)).toEqual({
        0: ["S0", "S1", "S2"],
        1: ["H0", "H1", "H2"],
        2: ["D2", "D0", "D1"],
      });
      expectIdentityPreserved(result, input);

      // Idempotent: re-feeding the output yields the identical order.
      const again = sortNodesInSections(result, [0, 1, 2], edges);
      expect(sectionIds(again)).toEqual(sectionIds(result));
    });

    it("lets single-parent children follow their reordered multi-parent parent to reach 0 crossings", () => {
      // root [a,b,c,d]; section 1 [m1,m2] is multi-parent with a clean split
      // (c,d -> m1 ; a,b -> m2); section 2 [x<-m1, y<-m2] single-parent. The
      // optimum needs BOTH the parent order swapped (m2,m1) AND the children to
      // follow (y,x) — placing the tree after the head settles reaches it.
      const e = {
        am2: { source: "a", target: "m2", value: 1 },
        bm2: { source: "b", target: "m2", value: 1 },
        cm1: { source: "c", target: "m1", value: 1 },
        dm1: { source: "d", target: "m1", value: 1 },
        m1x: { source: "m1", target: "x", value: 2 },
        m2y: { source: "m2", target: "y", value: 2 },
      };
      const testNodes: Record<string, TestNode> = {
        a: { id: "a", depth: 0, value: 1, inEdges: [], outEdges: [e.am2] },
        b: { id: "b", depth: 0, value: 1, inEdges: [], outEdges: [e.bm2] },
        c: { id: "c", depth: 0, value: 1, inEdges: [], outEdges: [e.cm1] },
        d: { id: "d", depth: 0, value: 1, inEdges: [], outEdges: [e.dm1] },
        m1: {
          id: "m1",
          depth: 1,
          value: 2,
          inEdges: [e.cm1, e.dm1],
          outEdges: [e.m1x],
        },
        m2: {
          id: "m2",
          depth: 1,
          value: 2,
          inEdges: [e.am2, e.bm2],
          outEdges: [e.m2y],
        },
        x: { id: "x", depth: 2, value: 2, inEdges: [e.m1x], outEdges: [] },
        y: { id: "y", depth: 2, value: 2, inEdges: [e.m2y], outEdges: [] },
      };
      const { nodes: graph, edges } = buildGraph(testNodes);
      const input = {
        0: [graph.a, graph.b, graph.c, graph.d],
        1: [graph.m1, graph.m2],
        2: [graph.x, graph.y],
      };
      const result = sortNodesInSections(input, [0, 1, 2], edges);

      expect(sectionIds(result)).toEqual({
        0: ["a", "b", "c", "d"],
        1: ["m2", "m1"],
        2: ["y", "x"],
      });
      expectIdentityPreserved(result, input);
    });
  });

  describe("dominantNeighborIndex", () => {
    it("returns the index of the single heaviest neighbor", () => {
      const map = new Map([
        ["light", 0],
        ["heavy", 3],
      ]);
      const result = dominantNeighborIndex(
        [
          { id: "light", weight: 1 },
          { id: "heavy", weight: 5 },
        ],
        map,
        9
      );
      expect(result).toBe(3);
    });

    it("breaks weight ties by the earliest edge", () => {
      const map = new Map([
        ["a", 2],
        ["b", 4],
      ]);
      const result = dominantNeighborIndex(
        [
          { id: "a", weight: 1 },
          { id: "b", weight: 1 },
        ],
        map,
        9
      );
      expect(result).toBe(2);
    });

    it("falls back when no neighbor is in the reference section", () => {
      const result = dominantNeighborIndex(
        [{ id: "missing", weight: 1 }],
        new Map(),
        7
      );
      expect(result).toBe(7);
    });
  });
});
