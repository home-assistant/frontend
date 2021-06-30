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

interface Tooltip extends TooltipModel<any> {
  top: string;
  left: string;
}

@customElement("ha-chart-base")
export default class HaChartBase extends LitElement {
  public chart?: Chart;

  @property({ attribute: "chart-type", reflect: true })
  public chartType: ChartType = "line";

  @property({ attribute: false })
  public data: ChartData = { datasets: [] };

  @property({ attribute: false })
  public options?: ChartOptions;

  @state() private _tooltip?: Tooltip;

  @state() private _height?: string;

  @state() private _hiddenDatasets: Set<number> = new Set();

  protected firstUpdated() {
    this._setupChart();
    this.data.datasets.forEach((dataset, index) => {
      if (dataset.hidden) {
        this._hiddenDatasets.add(index);
      }
    });
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated || !this.chart) {
      return;
    }

    if (changedProps.has("type")) {
      this.chart.config.type = this.chartType;
    }

    if (changedProps.has("data")) {
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
        ? html` <div class="chartLegend">
            <ul>
              ${this.data.datasets.map(
                (dataset, index) => html`<li
                  .datasetIndex=${index}
                  @click=${this._legendClick}
                  class=${classMap({
                    hidden: this._hiddenDatasets.has(index),
                  })}
                >
                  <div
                    class="bullet"
                    style=${styleMap({
                      backgroundColor: dataset.backgroundColor as string,
                      borderColor: dataset.borderColor as string,
                    })}
                  ></div>
                  ${dataset.label}
                </li>`
              )}
            </ul>
          </div>`
        : ""}
      <div
        class="chartContainer"
        style=${styleMap({
          height:
            this.chartType === "timeline"
              ? `${this.data.datasets.length * 30 + 30}px`
              : this._height,
          overflow: this._height ? "initial" : "hidden",
        })}
      >
        <canvas></canvas>
        ${this._tooltip
          ? html`<div
              class="chartTooltip ${classMap({ [this._tooltip.yAlign]: true })}"
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
                    (item, i) => html`<li>
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
            </div>`
          : ""}
      </div>
    `;
  }

  private async _setupChart() {
    const ctx: CanvasRenderingContext2D = this.renderRoot
      .querySelector("canvas")!
      .getContext("2d")!;

    this.chart = new (await import("../../resources/chartjs")).Chart(ctx, {
      type: this.chartType,
      data: this.data,
      options: this._createOptions(),
      plugins: [
        {
          id: "afterRenderHook",
          afterRender: (chart) => {
            this._height = `${chart.height}px`;
          },
        },
      ],
    });
  }

  private _createOptions() {
    return {
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
        clamp(context.tooltip.caretX, 100, this.clientWidth - 100) -
        100 +
        "px",
    };
  }

  public updateChart = (): void => {
    if (this.chart) {
      this.chart.update();
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      .chartContainer {
        overflow: hidden;
        height: 0;
        transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      :host(:not([chart-type="timeline"])) canvas {
        max-height: 400px;
      }
      .chartLegend {
        text-align: center;
      }
      .chartLegend li {
        cursor: pointer;
        display: inline-flex;
        padding: 0 8px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        box-sizing: border-box;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .chartLegend .hidden {
        text-decoration: line-through;
      }
      .chartLegend .bullet,
      .chartTooltip .bullet {
        border-width: 1px;
        border-style: solid;
        border-radius: 50%;
        display: inline-block;
        height: 16px;
        margin-right: 4px;
        width: 16px;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .chartTooltip .bullet {
        align-self: baseline;
      }
      :host([rtl]) .chartTooltip .bullet {
        margin-right: inherit;
        margin-left: 4px;
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
      }
      .chartTooltip .title {
        text-align: center;
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
