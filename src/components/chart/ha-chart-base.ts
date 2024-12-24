import type {
  Chart,
  ChartType,
  ChartData,
  ChartOptions,
  TooltipModel,
} from "chart.js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";
import { clamp } from "../../common/number/clamp";
import type { HomeAssistant } from "../../types";
import { debounce } from "../../common/util/debounce";
import { isMac } from "../../util/is_mac";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;

export interface ChartResizeOptions {
  aspectRatio?: number;
  height?: number;
  width?: number;
}

interface Tooltip
  extends Omit<TooltipModel<any>, "tooltipPosition" | "hasValue" | "getProps"> {
  top: string;
  left: string;
}

export interface ChartDatasetExtra {
  show_legend?: boolean;
  legend_label?: string;
}

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: Chart;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "chart-type", reflect: true })
  public chartType: ChartType = "line";

  @property({ attribute: false }) public data: ChartData = { datasets: [] };

  @property({ attribute: false }) public extraData?: ChartDatasetExtra[];

  @property({ attribute: false }) public options?: ChartOptions;

  @property({ attribute: false }) public plugins?: any[];

  @property({ type: Number }) public height?: number;

  @property({ attribute: false, type: Number }) public paddingYAxis = 0;

  @property({ attribute: "external-hidden", type: Boolean })
  public externalHidden = false;

  @state() private _chartHeight?: number;

  @state() private _legendHeight?: number;

  @state() private _tooltip?: Tooltip;

  @state() private _hiddenDatasets: Set<number> = new Set();

  @state() private _showZoomHint = false;

  @state() private _isZoomed = false;

  private _paddingUpdateCount = 0;

  private _paddingUpdateLock = false;

  private _paddingYAxisInternal = 0;

  private _datasetOrder: number[] = [];

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._releaseCanvas();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._releaseCanvas();
      this._setupChart();
    }
  }

  public updateChart = (
    mode:
      | "resize"
      | "reset"
      | "none"
      | "hide"
      | "show"
      | "default"
      | "active"
      | undefined
  ): void => {
    this.chart?.update(mode);
  };

  public resize = (options?: ChartResizeOptions): void => {
    if (options?.aspectRatio && !options.height) {
      options.height = Math.round(
        (options.width ?? this.clientWidth) / options.aspectRatio
      );
    } else if (options?.aspectRatio && !options.width) {
      options.width = Math.round(
        (options.height ?? this.clientHeight) * options.aspectRatio
      );
    }
    this.chart?.resize(
      options?.width ?? this.clientWidth,
      options?.height ?? this.clientHeight
    );
  };

  protected firstUpdated() {
    this._setupChart();
    this.data.datasets.forEach((dataset, index) => {
      if (dataset.hidden) {
        this._hiddenDatasets.add(index);
      }
    });
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

    // put the legend labels in sorted order if provided
    if (changedProps.has("data")) {
      this._datasetOrder = this.data.datasets.map((_, index) => index);
      if (this.data?.datasets.some((dataset) => dataset.order)) {
        this._datasetOrder.sort(
          (a, b) =>
            (this.data.datasets[a].order || 0) -
            (this.data.datasets[b].order || 0)
        );
      }

      if (this.externalHidden) {
        this._hiddenDatasets = new Set();
        if (this.data?.datasets) {
          this.data.datasets.forEach((dataset, index) => {
            if (dataset.hidden) {
              this._hiddenDatasets.add(index);
            }
          });
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
      if (this._hiddenDatasets.size && !this.externalHidden) {
        this.data.datasets.forEach((dataset, index) => {
          dataset.hidden = this._hiddenDatasets.has(index);
        });
      }
      this.chart.data = this.data;
    }
    if (changedProps.has("options") && !this.chart.isZoomedOrPanned()) {
      // this resets the chart zoom because min/max scales changed
      // so we only do it if the user is not zooming or panning
      this.chart.options = this._createOptions();
    }
    this.chart.update("none");
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("data") || changedProperties.has("options")) {
      if (this.options?.plugins?.legend?.display) {
        this._legendHeight =
          this.renderRoot.querySelector(".chart-legend")?.clientHeight;
      } else {
        this._legendHeight = 0;
      }
    }
  }

  protected render() {
    return html`
      ${this.options?.plugins?.legend?.display === true
        ? html`<div class="chart-legend">
            <ul>
              ${this._datasetOrder.map((index) => {
                const dataset = this.data.datasets[index];
                return this.extraData?.[index]?.show_legend === false
                  ? nothing
                  : html`<li
                      .datasetIndex=${index}
                      @click=${this._legendClick}
                      class=${classMap({
                        hidden: this._hiddenDatasets.has(index),
                      })}
                      .title=${this.extraData?.[index]?.legend_label ??
                      dataset.label}
                    >
                      <div
                        class="bullet"
                        style=${styleMap({
                          backgroundColor: dataset.backgroundColor as string,
                          borderColor: dataset.borderColor as string,
                        })}
                      ></div>
                      <div class="label">
                        ${this.extraData?.[index]?.legend_label ??
                        dataset.label}
                      </div>
                    </li>`;
              })}
            </ul>
          </div>`
        : ""}
      <div
        class="animation-container"
        style=${styleMap({
          height: `${this.height || this._chartHeight || 0}px`,
          overflow: this._chartHeight ? "initial" : "hidden",
        })}
      >
        <div
          class="chart-container"
          style=${styleMap({
            height: `${
              this.height ?? this._chartHeight ?? this.clientWidth / 2
            }px`,
            "padding-left": `${this._paddingYAxisInternal}px`,
            "padding-right": 0,
            "padding-inline-start": `${this._paddingYAxisInternal}px`,
            "padding-inline-end": 0,
          })}
          @wheel=${this._handleChartScroll}
        >
          <canvas
            class=${classMap({
              "not-zoomed": !this._isZoomed,
            })}
          ></canvas>
          <div
            class="zoom-hint ${classMap({
              visible: this._showZoomHint,
            })}"
          >
            <div>
              ${isMac
                ? this.hass.localize(
                    "ui.components.history_charts.zoom_hint_mac"
                  )
                : this.hass.localize("ui.components.history_charts.zoom_hint")}
            </div>
          </div>
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
      </div>
    `;
  }

  private _loading = false;

  private async _setupChart() {
    if (this._loading) return;
    const ctx: CanvasRenderingContext2D = this.renderRoot
      .querySelector("canvas")!
      .getContext("2d")!;
    this._loading = true;
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const ChartConstructor = (await import("../../resources/chartjs")).Chart;

      const computedStyles = getComputedStyle(this);

      ChartConstructor.defaults.borderColor =
        computedStyles.getPropertyValue("--divider-color");
      ChartConstructor.defaults.color = computedStyles.getPropertyValue(
        "--secondary-text-color"
      );
      ChartConstructor.defaults.font.family =
        computedStyles.getPropertyValue("--mdc-typography-body1-font-family") ||
        computedStyles.getPropertyValue("--mdc-typography-font-family") ||
        "Roboto, Noto, sans-serif";

      this.chart = new ChartConstructor(ctx, {
        type: this.chartType,
        data: this.data,
        options: this._createOptions(),
        plugins: this._createPlugins(),
      });
    } finally {
      this._loading = false;
    }
  }

  private _createOptions(): ChartOptions {
    const modifierKey = isMac ? "meta" : "ctrl";
    return {
      maintainAspectRatio: false,
      animation: {
        duration: 500,
      },
      ...this.options,
      plugins: {
        ...this.options?.plugins,
        tooltip: {
          ...this.options?.plugins?.tooltip,
          enabled: false,
          external: (context) => this._handleTooltip(context),
        },
        legend: {
          ...this.options?.plugins?.legend,
          display: false,
        },
        zoom: {
          ...this.options?.plugins?.zoom,
          pan: {
            enabled: true,
          },
          zoom: {
            pinch: {
              enabled: true,
            },
            drag: {
              enabled: true,
              modifierKey,
              threshold: 2,
            },
            wheel: {
              enabled: true,
              modifierKey,
              speed: 0.05,
            },
            mode: "x",
            onZoomComplete: () => {
              const isZoomed = this.chart?.isZoomedOrPanned() ?? false;
              if (this._isZoomed && !isZoomed) {
                setTimeout(() => {
                  // make sure the scales are properly reset after full zoom out
                  // they get bugged when zooming in/out multiple times and panning
                  this.chart?.resetZoom();
                });
              }
              this._isZoomed = isZoomed;
            },
          },
          limits: {
            x: {
              min: "original",
              max: (this.options?.scales?.x as any)?.max ?? "original",
            },
            y: {
              min: "original",
              max: "original",
            },
          },
        },
      },
    };
  }

  private _createPlugins() {
    return [
      ...(this.plugins || []),
      {
        id: "resizeHook",
        resize: (chart) => {
          const change = chart.height - (this._chartHeight ?? 0);
          if (!this._chartHeight || change > 12 || change < -12) {
            // hysteresis to prevent infinite render loops
            this._chartHeight = chart.height;
          }
        },
        legend: {
          ...this.options?.plugins?.legend,
          display: false,
        },
      },
    ];
  }

  private _handleChartScroll(ev: MouseEvent) {
    const modifier = isMac ? "metaKey" : "ctrlKey";
    this._tooltip = undefined;
    if (!ev[modifier] && !this._showZoomHint) {
      this._showZoomHint = true;
      setTimeout(() => {
        this._showZoomHint = false;
      }, 1000);
    }
  }

  private _legendClick(ev) {
    if (!this.chart) {
      return;
    }
    const index = ev.currentTarget.datasetIndex;
    if (this.chart.isDatasetVisible(index)) {
      this.chart.setDatasetVisibility(index, false);
      this._hiddenDatasets.add(index);
      if (this.externalHidden) {
        fireEvent(this, "dataset-hidden", {
          index,
        });
      }
    } else {
      this.chart.setDatasetVisibility(index, true);
      this._hiddenDatasets.delete(index);
      if (this.externalHidden) {
        fireEvent(this, "dataset-unhidden", {
          index,
        });
      }
    }
    this.chart.update("none");
    this.requestUpdate("_hiddenDatasets");
  }

  private _handleTooltip(context: {
    chart: Chart;
    tooltip: TooltipModel<any>;
  }) {
    if (context.tooltip.opacity === 0) {
      this._tooltip = undefined;
      return;
    }
    const boundingBox = this.getBoundingClientRect();
    this._tooltip = {
      ...context.tooltip,
      top:
        boundingBox.y +
        (this._legendHeight || 0) +
        context.tooltip.caretY +
        12 +
        "px",
      left:
        clamp(
          boundingBox.x + context.tooltip.caretX,
          boundingBox.x + 100,
          boundingBox.x + boundingBox.width - 100
        ) -
        100 +
        "px",
    };
  }

  private _releaseCanvas() {
    // release the canvas memory to prevent
    // safari from running out of memory.
    if (this.chart) {
      this.chart.destroy();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      .animation-container {
        overflow: hidden;
        height: 0;
        transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      canvas {
        max-height: var(--chart-max-height, 400px);
      }
      canvas.not-zoomed {
        /* allow scrolling if the chart is not zoomed */
        touch-action: pan-y !important;
      }
      .chart-legend {
        text-align: center;
      }
      .chart-legend li {
        cursor: pointer;
        display: inline-grid;
        grid-auto-flow: column;
        padding: 0 8px;
        box-sizing: border-box;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .chart-legend .hidden {
        text-decoration: line-through;
      }
      .chart-legend .label {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      .chart-legend .bullet,
      .chart-tooltip .bullet {
        border-width: 1px;
        border-style: solid;
        border-radius: 50%;
        display: inline-block;
        height: 16px;
        margin-right: 6px;
        width: 16px;
        flex-shrink: 0;
        box-sizing: border-box;
        margin-inline-end: 6px;
        margin-inline-start: initial;
        direction: var(--direction);
      }
      .chart-tooltip .bullet {
        align-self: baseline;
      }
      .chart-tooltip {
        padding: 8px;
        font-size: 90%;
        position: fixed;
        background: rgba(80, 80, 80, 0.9);
        color: white;
        border-radius: 4px;
        pointer-events: none;
        z-index: 1;
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        width: 200px;
        box-sizing: border-box;
        direction: var(--direction);
      }
      .chart-legend ul,
      .chart-tooltip ul {
        display: inline-block;
        padding: 0 0px;
        margin: 8px 0 0 0;
        width: 100%;
      }
      .chart-tooltip ul {
        margin: 0 4px;
      }
      .chart-tooltip li {
        display: flex;
        white-space: pre-line;
        word-break: break-word;
        align-items: center;
        line-height: 16px;
        padding: 4px 0;
      }
      .chart-tooltip .title {
        text-align: center;
        font-weight: 500;
        word-break: break-word;
        direction: ltr;
      }
      .chart-tooltip .footer {
        font-weight: 500;
      }
      .chart-tooltip .before-body {
        text-align: center;
        font-weight: 300;
        word-break: break-all;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
  interface HASSDomEvents {
    "dataset-hidden": { index: number };
    "dataset-unhidden": { index: number };
  }
}
