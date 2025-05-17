import type { EChartsType } from "echarts/core";
import type { GraphSeriesOption } from "echarts/charts";
import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { TopLevelFormatterParams } from "echarts/types/dist/shared";
import { mdiGoogleCirclesGroup } from "@mdi/js";
import memoizeOne from "memoize-one";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { ECOption } from "../../resources/echarts";
import "./ha-chart-base";
import type { HaChartBase } from "./ha-chart-base";
import type { HomeAssistant } from "../../types";

export interface NetworkNode {
  id: string;
  name?: string;
  category?: number;
  label?: string;
  value?: number;
  symbolSize?: number;
  symbol?: string;
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
  fixed?: boolean;
  polarDistance?: number; // distance from the center, where 0 is the center and 1 is the edge
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
  label?: {
    show?: boolean;
    formatter?: string;
  };
  ignoreForceLayout?: boolean;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  categories?: { name: string }[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-imports
let GraphChart: typeof import("echarts/lib/chart/graph/install");

@customElement("ha-network-graph")
export class HaNetworkGraph extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public data?: NetworkData;

  @property({ attribute: false }) public tooltipFormatter?: (
    params: TopLevelFormatterParams
  ) => string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _reducedMotion = false;

  @state() private _physicsEnabled = true;

  private _listeners: (() => void)[] = [];

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

  public async connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
        }
      })
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  shouldUpdate(changedProperties: PropertyValues) {
    // don't update if only hass changes
    return changedProperties.size > 1 || !changedProperties.has("hass");
  }

  protected render() {
    if (!GraphChart) {
      return nothing;
    }
    return html`<ha-chart-base
      .hass=${this.hass}
      .data=${this._getSeries(
        this.data,
        this._physicsEnabled,
        this._reducedMotion
      )}
      .options=${this._createOptions(this.data?.categories)}
      height="100%"
      .extraComponents=${[GraphChart]}
    >
      <slot name="button" slot="button"></slot>
      <ha-icon-button
        slot="button"
        class="refresh-button ${this._physicsEnabled ? "active" : "inactive"}"
        .path=${mdiGoogleCirclesGroup}
        @click=${this._togglePhysics}
        label=${this.hass.localize(
          "ui.panel.config.common.graph.toggle_physics"
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
        data: categories,
        top: 8,
      },
      dataZoom: {
        type: "inside",
        filterMode: "none",
      },
    })
  );

  private _getSeries = memoizeOne(
    (data?: NetworkData, physicsEnabled?: boolean, reducedMotion?: boolean) => {
      if (!data) {
        return [];
      }

      const containerWidth = this.clientWidth;
      const containerHeight = this.clientHeight;
      return [
        {
          id: "network",
          type: "graph",
          layout: physicsEnabled ? "force" : "none",
          draggable: true,
          roam: true,
          selectedMode: "single",
          label: {
            show: true,
            position: "right",
          },
          emphasis: {
            focus: "adjacency",
          },
          force: {
            repulsion: [400, 600],
            edgeLength: [200, 300],
            gravity: 0.1,
            layoutAnimation: !reducedMotion,
          },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: 10,
          data: data.nodes.map((node) => {
            const echartsNode: NonNullable<GraphSeriesOption["data"]>[number] =
              {
                id: node.id,
                name: node.name,
                category: node.category,
                value: node.value,
                symbolSize: node.symbolSize || 30,
                symbol: node.symbol || "circle",
                itemStyle: node.itemStyle || {},
                fixed: node.fixed,
              };
            if (this._nodePositions[node.id]) {
              echartsNode.x = this._nodePositions[node.id].x;
              echartsNode.y = this._nodePositions[node.id].y;
            } else if (typeof node.polarDistance === "number") {
              // set the position of the node at polarDistance from the center in a random direction
              const angle = Math.random() * 2 * Math.PI;
              echartsNode.x =
                containerWidth / 2 +
                ((Math.cos(angle) * containerWidth) / 2) * node.polarDistance;
              echartsNode.y =
                containerHeight / 2 +
                ((Math.sin(angle) * containerHeight) / 2) * node.polarDistance;
              this._nodePositions[node.id] = {
                x: echartsNode.x,
                y: echartsNode.y,
              };
            }
            return echartsNode;
          }),
          links: data.links.map((link) => ({
            ...link,
            value: link.reverseValue
              ? Math.max(link.value ?? 0, link.reverseValue)
              : link.value,
            // remove arrow for bidirectional links
            symbolSize: link.reverseValue ? 1 : link.symbolSize, // 0 doesn't work
          })),
          categories: data.categories || [],
        },
      ] as any;
    }
  );

  private _togglePhysics() {
    if (this._baseChart?.chart) {
      this._baseChart.chart
        // @ts-ignore private method but no other way to get the graph positions
        .getModel()
        .getSeriesByIndex(0)
        .getGraph()
        .eachNode((node: any) => {
          const layout = node.getLayout();
          if (layout) {
            this._nodePositions[node.id] = {
              x: layout[0],
              y: layout[1],
            };
          }
        });
    }
    this._physicsEnabled = !this._physicsEnabled;
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
