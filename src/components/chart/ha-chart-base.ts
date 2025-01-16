import type {
  // Chart,
  ChartType,
  ChartData,
  TooltipModel,
  UpdateMode,
} from "chart.js";
import type { PropertyValues } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { mdiRestart } from "@mdi/js";
import type { EChartsType } from "echarts/core";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import { debounce } from "../../common/util/debounce";
import { isMac } from "../../util/is_mac";
import "../ha-icon-button";
import type { ECOption } from "../../resources/echarts";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;

interface Tooltip
  extends Omit<TooltipModel<any>, "tooltipPosition" | "hasValue" | "getProps"> {
  top: string;
  left: string;
}

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "chart-type", reflect: true })
  public chartType: ChartType = "line";

  @property({ attribute: false }) public data: ChartData = { datasets: [] };

  @property({ attribute: false }) public options?: ECOption;

  @property({ attribute: false }) public plugins?: any[];

  @property({ type: Number }) public height?: number;

  @property({ attribute: false, type: Number }) public paddingYAxis = 0;

  @property({ attribute: "external-hidden", type: Boolean })
  public externalHidden = false;

  @state() private _tooltip?: Tooltip;

  @state() private _showZoomHint = false;

  @state() private _isZoomed = false;

  private _width = new ResizeController(this, {
    callback: (entries) => {
      this.chart?.resize();
      return entries[0]?.contentRect.width ?? 0;
    },
  });

  private _paddingUpdateCount = 0;

  private _paddingUpdateLock = false;

  private _paddingYAxisInternal = 0;

  private _datasetOrder: number[] = [];

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._handleScroll, true);
    this._releaseCanvas();
  }

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("scroll", this._handleScroll, true);
    if (this.hasUpdated) {
      this._releaseCanvas();
      this._setupChart();
    }
  }

  public updateChart = (mode?: UpdateMode): void => {
    this.chart?.update(mode);
  };

  protected firstUpdated() {
    this._setupChart();
  }

  public shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      this._paddingUpdateLock &&
      changedProps.size === 1 &&
      changedProps.has("paddingYAxis")
    ) {
      return false;
    }
    return true;
  }

  private _debouncedClearUpdates = debounce(
    () => {
      this._paddingUpdateCount = 0;
    },
    2000,
    false
  );

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._paddingUpdateLock) {
      this._paddingYAxisInternal = this.paddingYAxis;
      if (changedProps.size === 1 && changedProps.has("paddingYAxis")) {
        this._paddingUpdateCount++;
        if (this._paddingUpdateCount > 300) {
          this._paddingUpdateLock = true;
          // eslint-disable-next-line
          console.error(
            "Detected excessive chart padding updates, possibly an infinite loop. Disabling axis padding."
          );
        } else {
          this._debouncedClearUpdates();
        }
      }
    }

    if (!this.hasUpdated || !this.chart) {
      return;
    }
    if (changedProps.has("plugins") || changedProps.has("chartType")) {
      this._releaseCanvas();
      this._setupChart();
      return;
    }
    if (changedProps.has("data")) {
      this.chart?.setOption(this._createOptions());
      // this.chart.data = this.data;
    }
    // if (changedProps.has("options") && !this.chart.isZoomedOrPanned()) {
    //   // this resets the chart zoom because min/max scales changed
    //   // so we only do it if the user is not zooming or panning
    //   this.chart.options = this._createOptions();
    // }
    // this.chart.update("none");
  }

  protected render() {
    return html`
      <div
        class="chart-container"
        style=${styleMap({
          height: `${this.height ?? this._getDefaultHeight()}px`,
          "padding-left": `${this._paddingYAxisInternal}px`,
          "padding-right": 0,
          "padding-inline-start": `${this._paddingYAxisInternal}px`,
          "padding-inline-end": 0,
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
        ${this._isZoomed && this.chartType !== "timeline"
          ? html`<ha-icon-button
              class="zoom-reset"
              .path=${mdiRestart}
              @click=${this._handleZoomReset}
              title=${this.hass.localize(
                "ui.components.history_charts.zoom_reset"
              )}
            ></ha-icon-button>`
          : nothing}
        ${this._tooltip
          ? html`<div
              class="chart-tooltip ${classMap({
                [this._tooltip.yAlign]: true,
              })}"
              style=${styleMap({
                top: this._tooltip.top,
                left: this._tooltip.left,
              })}
            >
              <div class="title">${this._tooltip.title}</div>
              ${this._tooltip.beforeBody
                ? html`<div class="before-body">
                    ${this._tooltip.beforeBody}
                  </div>`
                : ""}
              <div>
                <ul>
                  ${this._tooltip.body.map(
                    (item, i) =>
                      html`<li>
                        <div
                          class="bullet"
                          style=${styleMap({
                            backgroundColor: this._tooltip!.labelColors[i]
                              .backgroundColor as string,
                            borderColor: this._tooltip!.labelColors[i]
                              .borderColor as string,
                          })}
                        ></div>
                        ${item.lines.join("\n")}
                      </li>`
                  )}
                </ul>
              </div>
              ${this._tooltip.footer.length
                ? html`<div class="footer">
                    ${this._tooltip.footer.map((item) => html`${item}<br />`)}
                  </div>`
                : ""}
            </div>`
          : ""}
      </div>
    `;
  }

  private _loading = false;

  private async _setupChart() {
    if (this._loading) return;
    const container = this.renderRoot.querySelector(".chart") as HTMLDivElement;
    this._loading = true;
    try {
      const echarts = (await import("../../resources/echarts")).default;

      // const computedStyles = getComputedStyle(this);

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
      aria: {
        show: true,
      },
      dataZoom: [
        {
          type: "inside",
          orient: "horizontal",
          filterMode: "none",
          zoomOnMouseWheel: "ctrl",
        },
      ],
      ...this.options,
    };
  }

  private _getDefaultHeight() {
    return this.clientWidth / 2;
  }

  private _releaseCanvas() {
    // release the canvas memory to prevent
    // safari from running out of memory.
    if (this.chart) {
      // this.chart.destroy();
    }
  }

  private _handleZoomReset() {
    // this.chart?.resetZoom();
  }

  private _handleScroll = () => {
    this._tooltip = undefined;
  };

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
