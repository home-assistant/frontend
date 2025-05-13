import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { EChartsType } from "echarts/core";
import type { GraphSeriesOption } from "echarts/charts";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { TopLevelFormatterParams } from "echarts/types/dist/shared";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { ECOption } from "../../resources/echarts";
import "./ha-chart-base";

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

@customElement("ha-network-graph")
export class HaNetworkGraph extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public data?: NetworkData;

  @property({ attribute: false }) public tooltipFormatter?: (
    params: TopLevelFormatterParams
  ) => string;

  @state() private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => {
      this.requestUpdate();
    },
  });

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
        }
      })
    );
  }

  protected render() {
    return html`<ha-chart-base
      .data=${this._getSeries()}
      .options=${this._createOptions()}
      height="100%"
      .extraComponents=${[]}
    >
      <slot name="button" slot="button"></slot>
    </ha-chart-base>`;
  }

  private _createOptions(): ECOption {
    return {
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: this.tooltipFormatter,
      },
      legend: {
        show: !!this.data?.categories?.length,
        data: this.data?.categories,
      },
      dataZoom: {
        type: "inside",
        filterMode: "none",
      },
    };
  }

  private _getSeries() {
    if (!this.data) {
      return [];
    }

    const containerWidth = this.clientWidth;
    const containerHeight = this.clientHeight;
    return [
      {
        id: "network",
        type: "graph",
        layout: "force",
        draggable: true,
        roam: true,
        selectedMode: "single",
        label: {
          show: true,
          position: "right",
          formatter: (params: any) => params.data.name,
        },
        emphasis: {
          focus: "adjacency",
          lineStyle: {
            width: 4,
          },
        },
        force: {
          repulsion: [400, 600],
          edgeLength: [200, 300],
          gravity: 0.1,
          layoutAnimation: !this._reducedMotion,
        },
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 10,
        data: this.data.nodes.map((node) => {
          const echartsNode: NonNullable<GraphSeriesOption["data"]>[number] = {
            id: node.id,
            name: node.name,
            category: node.category,
            value: node.value,
            symbolSize: node.symbolSize || 30,
            symbol: node.symbol || "circle",
            itemStyle: node.itemStyle || {},
            fixed: node.fixed,
          };
          if (typeof node.polarDistance === "number") {
            // set the position of the node at polarDistance from the center in a random direction
            const angle = Math.random() * 2 * Math.PI;
            echartsNode.x =
              containerWidth / 2 +
              ((Math.cos(angle) * containerWidth) / 2) * node.polarDistance;
            echartsNode.y =
              containerHeight / 2 +
              ((Math.sin(angle) * containerHeight) / 2) * node.polarDistance;
          }
          return echartsNode;
        }),
        links: this.data.links.map((link) => ({
          ...link,
          value: link.reverseValue
            ? Math.max(link.value ?? 0, link.reverseValue)
            : link.value,
        })),
        categories: this.data.categories || [],
      },
    ] as any;
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
