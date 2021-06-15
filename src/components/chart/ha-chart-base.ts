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

@customElement("ha-chart-base")
export default class HaChartBase extends LitElement {
  public chart?: Chart;

  @property()
  public chartType: ChartType = "line";

  @property({ attribute: false })
  public data: ChartData = { datasets: [] };

  @property({ attribute: false })
  public options?: ChartOptions;

  @state() private _tooltip?: TooltipModel<any>;

  protected firstUpdated() {
    this._setupChart();
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
      <div class="chartContainer">
        <canvas></canvas>
        ${this._tooltip
          ? html`<div
              class="chartTooltip ${classMap({ [this._tooltip.yAlign]: true })}"
              style=${styleMap({
                left:
                  clamp(this._tooltip.caretX, 100, this.clientWidth - 100) +
                  "px",
                top: this._tooltip.caretY + "px",
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
                      <em
                        style=${styleMap({
                          backgroundColor: this._tooltip!.labelColors[i]
                            .backgroundColor as string,
                          borderColor: this._tooltip!.labelColors[i]
                            .borderColor as string,
                        })}
                      ></em
                      >${item.lines.join("\n")}
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
      },
    };
  }

  private _handleTooltip(context: {
    chart: Chart;
    tooltip: TooltipModel<any>;
  }) {
    if (context.tooltip.opacity === 0) {
      this._tooltip = undefined;
      return;
    }
    this._tooltip = { ...context.tooltip };
  }

  public updateChart = (): void => {
    if (this.chart) {
      this.chart.update();
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      .chartContainer {
        position: relative;
      }
      :host {
        display: block;
      }
      .chartHeader {
        padding: 6px 0 0 0;
        width: 100%;
        display: flex;
        flex-direction: row;
      }
      .chartHeader > div {
        vertical-align: top;
        padding: 0 8px;
      }
      .chartHeader > div.chartTitle {
        padding-top: 8px;
        flex: 0 0 0;
        max-width: 30%;
      }
      .chartHeader > div.chartLegend {
        flex: 1 1;
        min-width: 70%;
      }
      .chartTooltip {
        padding: 4px;
        font-size: 90%;
        position: absolute;
        background: rgba(80, 80, 80, 0.9);
        color: white;
        border-radius: 4px;
        pointer-events: none;
        transform: translate(-50%, 12px);
        z-index: 1000;
        width: 200px;
        transition: opacity 0.15s ease-in-out;
      }
      :host([rtl]) .chartTooltip {
        direction: rtl;
      }
      .chartLegend ul,
      .chartTooltip ul {
        display: inline-block;
        padding: 0 0px;
        margin: 5px 0 0 0;
        width: 100%;
      }
      .chartTooltip ul {
        margin: 0 3px;
      }
      .chartTooltip li {
        display: block;
        white-space: pre-line;
      }
      .chartTooltip li::first-line {
        line-height: 0;
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
      .chartLegend li {
        display: inline-block;
        padding: 0 6px;
        max-width: 49%;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        box-sizing: border-box;
      }
      .chartLegend li:nth-child(odd):last-of-type {
        /* Make last item take full width if it is odd-numbered. */
        max-width: 100%;
      }
      .chartLegend li[data-hidden] {
        text-decoration: line-through;
      }
      .chartLegend em,
      .chartTooltip em {
        border-radius: 4px;
        display: inline-block;
        height: 10px;
        margin-right: 4px;
        width: 10px;
      }
      :host([rtl]) .chartTooltip em {
        margin-right: inherit;
        margin-left: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
}
