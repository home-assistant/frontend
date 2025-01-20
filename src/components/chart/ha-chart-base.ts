import type { PropertyValues } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { mdiRestart } from "@mdi/js";
import type { EChartsType } from "echarts/core";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { SeriesOption } from "echarts/types/dist/shared";
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

  @property({ attribute: false }) public data: SeriesOption[] = [];

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: Number }) public height?: number;

  @property({ attribute: "external-hidden", type: Boolean })
  public externalHidden = false;

  @state() private _showZoomHint = false;

  @state() private _isZoomed = false;

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
    if (changedProps.has("options")) {
      this.chart.setOption(this._createOptions(), {
        lazyUpdate: true,
        notMerge: true,
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
        <div
          class="zoom-hint ${classMap({
            visible: this._showZoomHint,
          })}"
        >
          <div>
            ${isMac
              ? this.hass.localize("ui.components.history_charts.zoom_hint_mac")
              : this.hass.localize("ui.components.history_charts.zoom_hint")}
          </div>
        </div>
        ${this._isZoomed && this.options?.dataZoom
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
      this.chart.setOption(this._createOptions());
    } finally {
      this._loading = false;
    }
  }

  private _createOptions(): ECOption {
    return {
      animation: !this._reducedMotion,
      darkMode: this.hass.themes?.darkMode,
      aria: {
        show: true,
      },
      dataZoom: [
        // {
        //   type: "inside",
        //   orient: "horizontal",
        //   filterMode: "none",
        //   zoomOnMouseWheel: "ctrl",
        //   moveOnMouseWheel: false,
        // },
      ],
      // @ts-ignore
      series: this.data,
      ...this.options,
    };
  }

  private _getDefaultHeight() {
    return this.clientWidth / 2;
  }

  private _handleZoomReset() {
    // this.chart?.resetZoom();
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
    canvas.not-zoomed {
      /* allow scrolling if the chart is not zoomed */
      touch-action: pan-y !important;
    }
    .chart {
      width: 100%;
      height: 100%;
    }
    .zoom-hint {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 500ms cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .zoom-hint.visible {
      opacity: 1;
    }
    .zoom-hint > div {
      color: white;
      font-size: 1.5em;
      font-weight: 500;
      padding: 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
      box-shadow: 0 0 32px 32px rgba(0, 0, 0, 0.3);
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
