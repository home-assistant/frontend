import type { PropertyValues } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { mdiRestart } from "@mdi/js";
import type { EChartsType } from "echarts/core";
import type { DataZoomComponentOption } from "echarts/components";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { XAXisOption, YAXisOption } from "echarts/types/dist/shared";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import { isMac } from "../../util/is_mac";
import "../ha-icon-button";
import type { ECOption } from "../../resources/echarts";
import { listenMediaQuery } from "../../common/dom/media_query";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: ECOption["series"] = [];

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: Number }) public height?: number;

  @property({ attribute: "external-hidden", type: Boolean })
  public externalHidden = false;

  @state() private _isZoomed = false;

  private _modifierPressed = false;

  private _isTouchDevice = "ontouchstart" in window;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => this.chart?.resize(),
  });

  private _loading = false;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this.chart?.dispose();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._setupChart();
    }

    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        this._reducedMotion = matches;
        this.chart?.setOption({ animation: !this._reducedMotion });
      })
    );

    // Add keyboard event listeners
    const handleKeyDown = (ev: KeyboardEvent) => {
      if ((isMac && ev.metaKey) || (!isMac && ev.ctrlKey)) {
        this._modifierPressed = true;
        if (!this.options?.dataZoom) {
          this.chart?.setOption({
            dataZoom: this._getDataZoomConfig(),
          });
        }
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if ((isMac && ev.key === "Meta") || (!isMac && ev.key === "Control")) {
        this._modifierPressed = false;
        if (!this.options?.dataZoom) {
          this.chart?.setOption({
            dataZoom: this._getDataZoomConfig(),
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    this._listeners.push(
      () => window.removeEventListener("keydown", handleKeyDown),
      () => window.removeEventListener("keyup", handleKeyUp)
    );
  }

  protected firstUpdated() {
    this._setupChart();
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated || !this.chart) {
      return;
    }
    if (changedProps.has("data")) {
      this.chart.setOption(
        { series: this.data },
        { lazyUpdate: true, replaceMerge: ["series"] }
      );
    }
    if (changedProps.has("options") || changedProps.has("_isZoomed")) {
      this.chart.setOption(this._createOptions(), {
        lazyUpdate: true,
        // if we replace the whole object, it will reset the dataZoom
        replaceMerge: [
          "xAxis",
          "yAxis",
          "dataZoom",
          "dataset",
          "tooltip",
          "legend",
          "grid",
          "visualMap",
        ],
      });
    }
  }

  protected render() {
    return html`
      <div
        class="chart-container"
        style=${styleMap({
          height: `${this.height ?? this._getDefaultHeight()}px`,
        })}
      >
        <div class="chart"></div>
        ${this._isZoomed
          ? html`<ha-icon-button
              class="zoom-reset"
              .path=${mdiRestart}
              @click=${this._handleZoomReset}
              title=${this.hass.localize(
                "ui.components.history_charts.zoom_reset"
              )}
            ></ha-icon-button>`
          : nothing}
      </div>
    `;
  }

  private async _setupChart() {
    if (this._loading) return;
    const container = this.renderRoot.querySelector(".chart") as HTMLDivElement;
    this._loading = true;
    try {
      const echarts = (await import("../../resources/echarts")).default;

      this.chart = echarts.init(container);
      this.chart.on("legendselectchanged", (params: any) => {
        if (this.externalHidden) {
          const isSelected = params.selected[params.name];
          if (isSelected) {
            fireEvent(this, "dataset-unhidden", { name: params.name });
          } else {
            fireEvent(this, "dataset-hidden", { name: params.name });
          }
        }
      });
      this.chart.on("datazoom", (e: any) => {
        const { start, end } = e.batch?.[0] ?? e;
        this._isZoomed = start !== 0 || end !== 100;
      });
      this.chart.setOption({ ...this._createOptions(), series: this.data });
    } finally {
      this._loading = false;
    }
  }

  private _getDataZoomConfig(): DataZoomComponentOption | undefined {
    const xAxis = (this.options?.xAxis?.[0] ??
      this.options?.xAxis) as XAXisOption;
    const yAxis = (this.options?.yAxis?.[0] ??
      this.options?.yAxis) as YAXisOption;
    if (xAxis.type === "value" || yAxis.type === "category") {
      // vertical data zoom doesn't work well in this case and horizontal is pointless
      return undefined;
    }
    return {
      id: "dataZoom",
      type: "inside",
      orient: "horizontal",
      filterMode: "none",
      moveOnMouseMove: this._isZoomed,
      preventDefaultMouseMove: this._isZoomed,
      zoomLock: !this._isTouchDevice && !this._modifierPressed,
    };
  }

  private _createOptions(): ECOption {
    return {
      animation: !this._reducedMotion,
      darkMode: this.hass.themes?.darkMode,
      aria: {
        show: true,
      },
      dataZoom: this._getDataZoomConfig(),
      ...this.options,
    };
  }

  private _getDefaultHeight() {
    return Math.max(this.clientWidth / 2, 400);
  }

  private _handleZoomReset() {
    this.chart?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    .chart-container {
      position: relative;
      max-height: var(--chart-max-height, 400px);
    }
    .chart {
      width: 100%;
      height: 100%;
    }
    .zoom-reset {
      position: absolute;
      top: 16px;
      right: 4px;
      background: var(--card-background-color);
      border-radius: 4px;
      --mdc-icon-button-size: 32px;
      color: var(--primary-color);
      border: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
  interface HASSDomEvents {
    "dataset-hidden": { name: string };
    "dataset-unhidden": { name: string };
  }
}
