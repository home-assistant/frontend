import type {
  Chart,
  ChartType,
  ChartData,
  ChartOptions,
  TooltipModel,
} from "chart.js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { clamp } from "../../common/number/clamp";
import { computeRTL } from "../../common/util/compute_rtl";
import { HomeAssistant } from "../../types";
import { debounce } from "../../common/util/debounce";

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

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: Chart;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "chart-type", reflect: true })
  public chartType: ChartType = "line";

  @property({ attribute: false }) public data: ChartData = { datasets: [] };

  @property({ attribute: false }) public options?: ChartOptions;

  @property({ attribute: false }) public plugins?: any[];

  @property({ type: Number }) public height?: number;

  @property({ type: Number }) public paddingYAxis = 0;

  @state() private _chartHeight?: number;

  @state() private _tooltip?: Tooltip;

  @state() private _hiddenDatasets: Set<number> = new Set();

  private _paddingUpdateCount = 0;

  private _paddingUpdateLock = false;

  private _paddingYAxisInternal = 0;

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

    if (!this.hasUpdated || !this.chart) {
      return;
    }
    if (changedProps.has("plugins") || changedProps.has("chartType")) {
      this._releaseCanvas();
      this._setupChart();
      return;
    }
    if (changedProps.has("data")) {
      if (this._hiddenDatasets.size) {
        this.data.datasets.forEach((dataset, index) => {
          dataset.hidden = this._hiddenDatasets.has(index);
        });
      }
      this.chart.data = this.data;
    }
    if (changedProps.has("options")) {
      this.chart.options = this._createOptions();
    }
    this.chart.update("none");
  }

  protected render() {
    return html`
      ${this.options?.plugins?.legend?.display === true
        ? html`<div class="chartLegend">
            <ul>
              ${this.data.datasets.map(
                (dataset, index) =>
                  html`<li
                    .datasetIndex=${index}
                    @click=${this._legendClick}
                    class=${classMap({
                      hidden: this._hiddenDatasets.has(index),
                    })}
                    .title=${dataset.label}
                  >
                    <div
                      class="bullet"
                      style=${styleMap({
                        backgroundColor: dataset.backgroundColor as string,
                        borderColor: dataset.borderColor as string,
                      })}
                    ></div>
                    <div class="label">${dataset.label}</div>
                  </li>`
              )}
            </ul>
          </div>`
        : ""}
      <div
        class="animationContainer"
        style=${styleMap({
          height: `${this.height || this._chartHeight || 0}px`,
          overflow: this._chartHeight ? "initial" : "hidden",
        })}
      >
        <div
          class="chartContainer"
          style=${styleMap({
            height: `${
              this.height ?? this._chartHeight ?? this.clientWidth / 2
            }px`,
            "padding-left": `${
              computeRTL(this.hass) ? 0 : this._paddingYAxisInternal
            }px`,
            "padding-right": `${
              computeRTL(this.hass) ? this._paddingYAxisInternal : 0
            }px`,
          })}
        >
          <canvas></canvas>
          ${this._tooltip
            ? html`<div
                class="chartTooltip ${classMap({
                  [this._tooltip.yAlign]: true,
                })}"
                style=${styleMap({
                  top: this._tooltip.top,
                  left: this._tooltip.left,
                })}
              >
                <div class="title">${this._tooltip.title}</div>
                ${this._tooltip.beforeBody
                  ? html`<div class="beforeBody">
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

  private async _setupChart() {
    const ctx: CanvasRenderingContext2D = this.renderRoot
      .querySelector("canvas")!
      .getContext("2d")!;

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
  }

  private _createOptions() {
    return {
      maintainAspectRatio: false,
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

  private _legendClick(ev) {
    if (!this.chart) {
      return;
    }
    const index = ev.currentTarget.datasetIndex;
    if (this.chart.isDatasetVisible(index)) {
      this.chart.setDatasetVisibility(index, false);
      this._hiddenDatasets.add(index);
    } else {
      this.chart.setDatasetVisibility(index, true);
      this._hiddenDatasets.delete(index);
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
    this._tooltip = {
      ...context.tooltip,
      top: this.chart!.canvas.offsetTop + context.tooltip.caretY + 12 + "px",
      left:
        this.chart!.canvas.offsetLeft +
        clamp(
          context.tooltip.caretX,
          100,
          this.clientWidth - 100 - this._paddingYAxisInternal
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
        position: var(--chart-base-position, relative);
      }
      .animationContainer {
        overflow: hidden;
        height: 0;
        transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      canvas {
        max-height: var(--chart-max-height, 400px);
      }
      .chartLegend {
        text-align: center;
      }
      .chartLegend li {
        cursor: pointer;
        display: inline-grid;
        grid-auto-flow: column;
        padding: 0 8px;
        box-sizing: border-box;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .chartLegend .hidden {
        text-decoration: line-through;
      }
      .chartLegend .label {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      .chartLegend .bullet,
      .chartTooltip .bullet {
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
      .chartTooltip .bullet {
        align-self: baseline;
      }
      :host([rtl]) .chartLegend .bullet,
      :host([rtl]) .chartTooltip .bullet {
        margin-right: inherit;
        margin-left: 6px;
        margin-inline-end: inherit;
        margin-inline-start: 6px;
        direction: var(--direction);
      }
      .chartTooltip {
        padding: 8px;
        font-size: 90%;
        position: absolute;
        background: rgba(80, 80, 80, 0.9);
        color: white;
        border-radius: 4px;
        pointer-events: none;
        z-index: 1000;
        width: 200px;
        box-sizing: border-box;
      }
      :host([rtl]) .chartTooltip {
        direction: rtl;
      }
      .chartLegend ul,
      .chartTooltip ul {
        display: inline-block;
        padding: 0 0px;
        margin: 8px 0 0 0;
        width: 100%;
      }
      .chartTooltip ul {
        margin: 0 4px;
      }
      .chartTooltip li {
        display: flex;
        white-space: pre-line;
        align-items: center;
        line-height: 16px;
        padding: 4px 0;
      }
      .chartTooltip .title {
        text-align: center;
        font-weight: 500;
        direction: ltr;
      }
      .chartTooltip .footer {
        font-weight: 500;
      }
      .chartTooltip .beforeBody {
        text-align: center;
        font-weight: 300;
        word-break: break-all;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
}
