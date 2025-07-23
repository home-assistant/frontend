import type { EChartsType } from "echarts/core";
import type { GraphSeriesOption } from "echarts/charts";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { TopLevelFormatterParams } from "echarts/types/dist/shared";
import { mdiFormatTextVariant, mdiGoogleCirclesGroup } from "@mdi/js";
import memoizeOne from "memoize-one";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { ECOption } from "../../resources/echarts";
import "./ha-chart-base";
import type { HaChartBase } from "./ha-chart-base";
import type { HomeAssistant } from "../../types";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { deepEqual } from "../../common/util/deep-equal";

export interface NetworkNode {
  id: string;
  name?: string;
  category?: number;
  value?: number;
  symbolSize?: number;
  symbol?: string;
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
  fixed?: boolean;
  /**
   * Distance from the center, where 0 is the center and 1 is the edge
   */
  polarDistance?: number;
  x?: number;
  y?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
  reverseValue?: number;
  lineStyle?: {
    width?: number;
    color?: string;
    type?: "solid" | "dashed" | "dotted";
  };
  symbolSize?: number | number[];
  symbol?: string;
  label?: {
    show?: boolean;
    formatter?: string;
  };
  ignoreForceLayout?: boolean;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  categories?: { name: string; symbol: string }[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-imports
let GraphChart: typeof import("echarts/lib/chart/graph/install");

@customElement("ha-network-graph")
export class HaNetworkGraph extends SubscribeMixin(LitElement) {
  public chart?: EChartsType;

  @property({ attribute: false }) public data!: NetworkData;

  @property({ attribute: false }) public tooltipFormatter?: (
    params: TopLevelFormatterParams
  ) => string;

  public hass!: HomeAssistant;

  @state() private _reducedMotion = false;

  @state() private _physicsEnabled = false;

  @state() private _showLabels = true;

  private _nodePositions: Record<string, { x: number; y: number }> = {};

  @query("ha-chart-base") private _baseChart?: HaChartBase;

  constructor() {
    super();
    if (!GraphChart) {
      import("echarts/lib/chart/graph/install").then((module) => {
        GraphChart = module;
        this.requestUpdate();
      });
    }
  }

  protected hassSubscribe() {
    return [
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
        }
      }),
    ];
  }

  protected render() {
    if (!GraphChart) {
      return nothing;
    }
    const isMobile = window.matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
    return html`<ha-chart-base
      .hass=${this.hass}
      .data=${this._getSeries(
        this.data,
        this._physicsEnabled,
        this._reducedMotion,
        this._showLabels,
        isMobile
      )}
      .options=${this._createOptions(this.data?.categories)}
      height="100%"
      .extraComponents=${[GraphChart]}
    >
      <slot name="button" slot="button"></slot>
      <ha-icon-button
        slot="button"
        class=${this._physicsEnabled ? "active" : "inactive"}
        .path=${mdiGoogleCirclesGroup}
        @click=${this._togglePhysics}
        label=${this.hass.localize(
          "ui.panel.config.common.graph.toggle_physics"
        )}
      ></ha-icon-button>
      <ha-icon-button
        slot="button"
        class=${this._showLabels ? "active" : "inactive"}
        .path=${mdiFormatTextVariant}
        @click=${this._toggleLabels}
        label=${this.hass.localize(
          "ui.panel.config.common.graph.toggle_labels"
        )}
      ></ha-icon-button>
    </ha-chart-base>`;
  }

  private _createOptions = memoizeOne(
    (categories?: NetworkData["categories"]): ECOption => ({
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: this.tooltipFormatter,
      },
      legend: {
        show: !!categories?.length,
        data: categories?.map((category) => ({
          ...category,
          icon: category.symbol,
        })),
        top: 8,
      },
      dataZoom: {
        type: "inside",
        filterMode: "none",
      },
    }),
    deepEqual
  );

  private _getSeries = memoizeOne(
    (
      data: NetworkData,
      physicsEnabled: boolean,
      reducedMotion: boolean,
      showLabels: boolean,
      isMobile: boolean
    ) => ({
      id: "network",
      type: "graph",
      layout: physicsEnabled ? "force" : "none",
      draggable: true,
      roam: true,
      selectedMode: "single",
      label: {
        show: showLabels,
        position: "right",
      },
      emphasis: {
        focus: isMobile ? "none" : "adjacency",
      },
      force: {
        repulsion: [400, 600],
        edgeLength: [200, 350],
        gravity: 0.05,
        layoutAnimation: !reducedMotion && data.nodes.length < 100,
      },
      edgeSymbol: ["none", "arrow"],
      edgeSymbolSize: 10,
      data: this._getSeriesData(data.nodes, data.links, this._nodePositions),
      links: data.links.map((link) => ({
        ...link,
        value: link.reverseValue
          ? Math.max(link.value ?? 0, link.reverseValue)
          : link.value,
        // remove arrow for bidirectional links
        symbolSize: link.reverseValue ? 1 : link.symbolSize, // 0 doesn't work
      })),
      categories: data.categories || [],
    }),
    deepEqual
  );

  private _getSeriesData = memoizeOne(
    (
      nodes: NetworkNode[],
      links: NetworkLink[],
      nodePositions: Record<string, { x: number; y: number }>
    ) =>
      this._getPositionedNodes(nodes, links, nodePositions).map(
        (node) =>
          ({
            id: node.id,
            name: node.name,
            category: node.category,
            value: node.value,
            symbolSize: node.symbolSize || 30,
            symbol: node.symbol || "circle",
            itemStyle: node.itemStyle || {},
            fixed: node.fixed,
            x: node.x,
            y: node.y,
          }) as NonNullable<GraphSeriesOption["data"]>[number]
      ),
    deepEqual
  );

  private _getPositionedNodes(
    nodes: NetworkNode[],
    links: NetworkLink[],
    nodePositions: Record<string, { x: number; y: number }>
  ) {
    const containerWidth = this.clientWidth;
    const containerHeight = this.clientHeight;
    const positionedNodes: NetworkNode[] = nodes.map((node) => ({ ...node }));
    positionedNodes.forEach((node) => {
      if (nodePositions[node.id]) {
        node.x = nodePositions[node.id].x;
        node.y = nodePositions[node.id].y;
      }
      if (node.polarDistance === 0) {
        if (node.x == null && node.y == null) {
          node.x = containerWidth / 2;
          node.y = containerHeight / 2;
        }
        this._positionNodeNeighbors(
          node,
          positionedNodes,
          links,
          nodePositions
        );
      }
    });
    positionedNodes.forEach((node) => {
      // set positions for unconnected nodes
      if (node.polarDistance && node.x == null && node.y == null) {
        // set the position of the node at polarDistance from the center in a random direction
        const angle = Math.random() * 2 * Math.PI;
        node.x =
          ((Math.cos(angle) * containerWidth) / 2) * node.polarDistance +
          containerWidth / 2;
        node.y =
          ((Math.sin(angle) * containerHeight) / 2) * node.polarDistance +
          containerHeight / 2;
        // save the random position
        this._nodePositions[node.id] = {
          x: node.x,
          y: node.y,
        };
      }
    });
    return positionedNodes;
  }

  private _positionNodeNeighbors(
    node: NetworkNode,
    nodes: NetworkNode[],
    links: NetworkLink[],
    nodePositions: Record<string, { x: number; y: number }>,
    parentId?: string,
    minAngle = 0,
    maxAngle = Math.PI * 2
  ) {
    const neighbors = links
      .map((l) =>
        l.source === node.id && l.target !== parentId && !l.ignoreForceLayout
          ? nodes.find((n) => n.id === l.target)
          : l.target === node.id &&
              l.source !== parentId &&
              !l.ignoreForceLayout
            ? nodes.find((n) => n.id === l.source)
            : null
      )
      .filter(Boolean) as NetworkNode[];
    if (!neighbors.length) {
      return;
    }
    const angle = Math.abs(maxAngle - minAngle) / neighbors.length;
    const toContinue: { neighbor: NetworkNode; angle: number }[] = [];
    neighbors.forEach((neighbor, i) => {
      if (neighbor.x == null && neighbor.y == null) {
        const nodeAngle = minAngle + angle * i + angle / 2;
        toContinue.push({ neighbor, angle: nodeAngle });
        if (nodePositions[neighbor.id]) {
          neighbor.x = nodePositions[neighbor.id].x;
          neighbor.y = nodePositions[neighbor.id].y;
        } else {
          neighbor.x = node.x! + (Math.cos(nodeAngle) * this.clientWidth) / 4;
          neighbor.y = node.y! + (Math.sin(nodeAngle) * this.clientHeight) / 4;
        }
      }
    });
    toContinue.forEach(({ neighbor, angle: neighborAngle }) => {
      this._positionNodeNeighbors(
        neighbor,
        nodes,
        links,
        nodePositions,
        node.id,
        neighborAngle - Math.PI / 2,
        neighborAngle + Math.PI / 2
      );
    });
  }

  private _togglePhysics() {
    this._saveNodePositions();
    this._physicsEnabled = !this._physicsEnabled;
  }

  private _toggleLabels() {
    this._showLabels = !this._showLabels;
  }

  private _saveNodePositions() {
    const positions = {};
    if (this._baseChart?.chart) {
      this._baseChart.chart
        // @ts-ignore private method but no other way to get the graph positions
        .getModel()
        .getSeriesByIndex(0)
        .getGraph()
        .eachNode((node: any) => {
          const layout = node.getLayout();
          if (layout) {
            positions[node.id] = {
              x: layout[0],
              y: layout[1],
            };
          }
        });
    }
    this._nodePositions = positions;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    ha-chart-base {
      height: 100%;
      --chart-max-height: 100%;
    }

    ha-icon-button,
    ::slotted(ha-icon-button) {
      margin-right: 12px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-network-graph": HaNetworkGraph;
  }
  interface HASSDomEvents {
    "node-selected": { id: string };
  }
}
