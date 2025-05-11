import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { EChartsType } from "echarts/core";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { listenMediaQuery } from "../../common/dom/media_query";
import { themesContext } from "../../data/context";
import type { Themes } from "../../data/ws-themes";
import type { ECOption } from "../../resources/echarts";
import type { HomeAssistant } from "../../types";
import "../ha-icon-button";

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

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data?: NetworkData;

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: String }) public height?: string;

  @property({ attribute: "graph-title" }) public graphTitle?: string;

  @state()
  @consume({ context: themesContext, subscribe: true })
  _themes!: Themes;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => {
      this.chart?.resize();
      setTimeout(() => this._centerCoordinatorNode(), 100);
    },
  });

  private _loading = false;

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this.chart?.dispose();
    this.chart = undefined;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._setupChart();
    }

    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
          this._setChartOptions({ animation: !this._reducedMotion });
        }
      })
    );
  }

  protected firstUpdated() {
    this._setupChart();
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (!this.chart) {
      return;
    }
    if (changedProps.has("_themes")) {
      this._setupChart();
      return;
    }

    let chartOptions: ECOption = {};
    if (changedProps.has("data")) {
      chartOptions.series = this._getSeries();
    }
    if (changedProps.has("options")) {
      chartOptions = { ...chartOptions, ...this._createOptions() };
    }
    if (Object.keys(chartOptions).length > 0) {
      this._setChartOptions(chartOptions);
    }
  }

  protected render() {
    return html`
      <div
        class="container"
        style=${styleMap({ height: this.height || "400px" })}
      >
        ${this.graphTitle
          ? html`<h2 class="title">${this.graphTitle}</h2>`
          : nothing}
        <div class="chart"></div>
      </div>
    `;
  }

  private async _setupChart() {
    if (this._loading) return;
    const container = this.renderRoot.querySelector(".chart") as HTMLDivElement;
    this._loading = true;
    try {
      if (this.chart) {
        this.chart.dispose();
      }
      const echarts = (await import("../../resources/echarts")).default;

      echarts.registerTheme("network", this._createTheme());

      this.chart = echarts.init(container, "network");

      this.chart.setOption({
        ...this._createOptions(),
        series: this._getSeries(),
      });

      // Center the coordinator node if it exists
      this._centerCoordinatorNode();
    } finally {
      this._loading = false;
    }
  }

  private _createTheme() {
    const style = getComputedStyle(this);
    return {
      backgroundColor: "transparent",
      textStyle: {
        color: style.getPropertyValue("--primary-text-color"),
        fontFamily: "Roboto, Noto, sans-serif",
      },
      tooltip: {
        backgroundColor: style.getPropertyValue("--card-background-color"),
        borderColor: style.getPropertyValue("--divider-color"),
        textStyle: {
          color: style.getPropertyValue("--primary-text-color"),
          fontSize: 12,
        },
      },
    };
  }

  private _createOptions(): ECOption {
    return {
      animation: !this._reducedMotion,
      darkMode: this._themes.darkMode ?? false,
      aria: { show: true },
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (params: any) => {
          if (params.dataType === "edge") {
            const { source, target, value } = params.data;
            const targetName = this.data!.nodes.find(
              (node) => node.id === target
            )!.name;
            const sourceName = this.data!.nodes.find(
              (node) => node.id === source
            )!.name;
            const tooltipText = `${sourceName} → ${targetName}${value ? ` <b>LQI:</b> ${value}` : ""}`;

            const reverseValue = this.data!.links.find(
              (link) => link.source === source && link.target === target
            )?.reverseValue;
            if (reverseValue) {
              return `${tooltipText}<br>${targetName} → ${sourceName} <b>LQI:</b> ${reverseValue}`;
            }
            return tooltipText;
          }
          return params.data.label || params.name;
        },
      },
      legend: {
        show: !!this.data?.categories?.length,
        data: this.data?.categories,
      },
      dataZoom: {
        type: "inside",
        filterMode: "none",
      },
      ...this.options,
    };
  }

  private _getSeries() {
    if (!this.data) {
      return [];
    }

    return [
      {
        // id: "network",
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
        autoCurveness: true,
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 10,
        data: this.data.nodes.map((node) => ({
          id: node.id,
          name: node.name,
          category: node.category,
          value: node.value,
          symbolSize: node.symbolSize || 30,
          symbol: node.symbol || "circle",
          label: node.label || node.name,
          itemStyle: node.itemStyle || {},
          fixed: node.fixed,
          x: node.x,
          y: node.y,
        })),
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

  private _setChartOptions(options: ECOption) {
    if (!this.chart) {
      return;
    }
    const replaceMerge = options.series ? ["series"] : [];
    this.chart.setOption(options, { replaceMerge });
  }

  private _centerCoordinatorNode() {
    if (!this.chart || !this.data) return;

    // Find the coordinator node (the one that's fixed)
    const coordinatorNode = this.data.nodes.find((node) => node.fixed);
    if (!coordinatorNode) return;

    // Get the container dimensions
    const containerWidth = this.chart.getWidth();
    const containerHeight = this.chart.getHeight();

    // Set the coordinator position to the center of the container
    this._setChartOptions({
      series: this._getSeries().map((series: any) => ({
        ...series,
        data: series.data.map((item: any) => {
          if (item.id === coordinatorNode.id) {
            return {
              ...item,
              x: containerWidth / 2,
              y: containerHeight / 2,
            };
          }
          return item;
        }),
      })),
    });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    .container {
      position: relative;
      width: 100%;
      height: 400px;
    }
    .chart {
      height: 100%;
      width: 100%;
    }
    .title {
      position: absolute;
      top: 8px;
      left: 8px;
      margin: 0;
      font-size: 16px;
      z-index: 10;
      color: var(--primary-text-color);
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
