import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiMagnifyPlus, mdiMagnifyMinus, mdiRestart } from "@mdi/js";
import type { EChartsType } from "echarts/core";
import type { ECElementEvent } from "echarts/types/dist/shared";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";
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
  lineStyle?: {
    width?: number;
    color?: string;
    type?: "solid" | "dashed" | "dotted";
  };
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

  @property({ attribute: "selected-node" }) public selectedNode?: string;

  @property({ attribute: "graph-title" }) public graphTitle?: string;

  @state()
  @consume({ context: themesContext, subscribe: true })
  _themes!: Themes;

  @state() private _isZoomed = false;

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
    if (changedProps.has("selectedNode")) {
      this._focusOnNode();
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
        <div class="controls">
          <ha-icon-button
            .path=${mdiMagnifyPlus}
            @click=${this._handleZoomIn}
            title=${this._getZoomInLabel()}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiMagnifyMinus}
            @click=${this._handleZoomOut}
            title=${this._getZoomOutLabel()}
          ></ha-icon-button>
          ${this._isZoomed
            ? html`<ha-icon-button
                .path=${mdiRestart}
                @click=${this._handleZoomReset}
                title=${this._getResetLabel()}
              ></ha-icon-button>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _getZoomInLabel(): string {
    return this.hass.localize("ui.common.zoom_in") || "Zoom in";
  }

  private _getZoomOutLabel(): string {
    return this.hass.localize("ui.common.zoom_out") || "Zoom out";
  }

  private _getResetLabel(): string {
    return this.hass.localize("ui.common.reset") || "Reset view";
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
      this.chart.on("click", (e: ECElementEvent) => {
        if (e.dataType === "node") {
          const nodeId = this.data?.nodes[e.dataIndex!]?.id;
          if (nodeId) {
            fireEvent(this, "node-selected", { id: nodeId });
            this.selectedNode = nodeId;
          }
        }
      });

      this.chart.setOption({
        ...this._createOptions(),
        series: this._getSeries(),
      });

      // Center the coordinator node if it exists
      this._centerCoordinatorNode();

      if (this.selectedNode) {
        this._focusOnNode();
      }
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
            return `${params.data.source} → ${params.data.target}${
              params.data.value ? `<br>LQI: ${params.data.value}` : ""
            }`;
          }
          return params.data.label || params.name;
        },
      },
      legend: {
        show: !!this.data?.categories?.length,
        data: this.data?.categories?.map((cat) => cat.name) || [],
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
        type: "graph",
        layout: "force",
        draggable: true,
        roam: true,
        zoom: 1.0,
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
          repulsion: 500,
          edgeLength: 250,
          gravity: 0.1,
          layoutAnimation: !this._reducedMotion,
        },
        autoCurveness: true,
        edgeLabel: {
          show: true,
          formatter: (params: any) => params.data.value || "",
          fontSize: 10,
        },
        edgeSymbol: ["none", "none"],
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
          source: link.source,
          target: link.target,
          value: link.value,
          lineStyle: link.lineStyle || {},
          label: link.label || {},
          ignoreForceLayout: link.ignoreForceLayout,
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

  private _focusOnNode() {
    if (!this.chart || !this.selectedNode || !this.data) {
      return;
    }

    const node = this.data.nodes.find((n) => n.id === this.selectedNode);
    if (!node) return;

    const nodeIndex = this.data.nodes.indexOf(node);

    // Highlight the selected node
    this.chart.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex: nodeIndex,
    });

    // Center view on the node
    this.chart.dispatchAction({
      type: "focusNodeAdjacency",
      seriesIndex: 0,
      dataIndex: nodeIndex,
    });

    this._isZoomed = true;
  }

  private _handleZoomIn() {
    if (!this.chart) return;
    const option = this.chart.getOption();
    const series = (option.series as any)[0];
    if (series.zoom) {
      series.zoom *= 1.2;
      this._setChartOptions({ series: [series] });
      this._isZoomed = true;
    }
  }

  private _handleZoomOut() {
    if (!this.chart) return;
    const option = this.chart.getOption();
    const series = (option.series as any)[0];
    if (series.zoom) {
      series.zoom *= 0.8;
      this._setChartOptions({ series: [series] });
    }
  }

  private _handleZoomReset() {
    if (!this.chart) return;
    const option = this.chart.getOption();
    const series = (option.series as any)[0];
    if (series.zoom) {
      series.zoom = 1.0;
      this._setChartOptions({ series: [series] });
      this._isZoomed = false;
    }

    // Clear node highlights
    this.chart.dispatchAction({
      type: "downplay",
      seriesIndex: 0,
    });
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
    this.chart.setOption({
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
    .controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }
    ha-icon-button {
      --mdc-icon-button-size: 36px;
      background: var(--card-background-color);
      border-radius: 18px;
      margin-bottom: 8px;
      color: var(--primary-text-color);
      box-shadow:
        0 2px 2px 0 rgba(0, 0, 0, 0.14),
        0 1px 5px 0 rgba(0, 0, 0, 0.12),
        0 3px 1px -2px rgba(0, 0, 0, 0.2);
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
