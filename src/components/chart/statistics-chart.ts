import type {
  ChartData,
  ChartDataset,
  ChartOptions,
  ChartType,
} from "chart.js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../common/color/colors";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../common/number/format_number";
import {
  getDisplayUnit,
  getStatisticLabel,
  getStatisticMetadata,
  Statistics,
  statisticsHaveType,
  StatisticsMetaData,
  StatisticType,
} from "../../data/recorder";
import type { HomeAssistant } from "../../types";
import "./ha-chart-base";

export type ExtendedStatisticType = StatisticType | "change";

export const supportedStatTypeMap: Record<
  ExtendedStatisticType,
  StatisticType
> = {
  mean: "mean",
  min: "min",
  max: "max",
  sum: "sum",
  state: "sum",
  change: "sum",
};

export const statTypeMap: Record<ExtendedStatisticType, StatisticType> = {
  mean: "mean",
  min: "min",
  max: "max",
  sum: "sum",
  state: "state",
  change: "sum",
};

@customElement("statistics-chart")
class StatisticsChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public statisticsData?: Statistics;

  @property({ attribute: false }) public metadata?: Record<
    string,
    StatisticsMetaData
  >;

  @property() public names?: Record<string, string>;

  @property() public unit?: string;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Array }) public statTypes: Array<ExtendedStatisticType> = [
    "sum",
    "min",
    "mean",
    "max",
  ];

  @property() public chartType: ChartType = "line";

  @property({ type: Boolean }) public hideLegend = false;

  @property({ type: Boolean }) public isLoadingData = false;

  @state() private _chartData: ChartData = { datasets: [] };

  @state() private _chartOptions?: ChartOptions;

  private _computedStyle?: CSSStyleDeclaration;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return changedProps.size > 1 || !changedProps.has("hass");
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated || changedProps.has("unit")) {
      this._createOptions();
    }
    if (
      changedProps.has("statisticsData") ||
      changedProps.has("statTypes") ||
      changedProps.has("chartType") ||
      changedProps.has("hideLegend")
    ) {
      this._generateData();
    }
  }

  public firstUpdated() {
    this._computedStyle = getComputedStyle(this);
  }

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "history")) {
      return html`<div class="info">
        ${this.hass.localize("ui.components.history_charts.history_disabled")}
      </div>`;
    }

    if (this.isLoadingData && !this.statisticsData) {
      return html`<div class="info">
        ${this.hass.localize(
          "ui.components.statistics_charts.loading_statistics"
        )}
      </div>`;
    }

    if (!this.statisticsData || !Object.keys(this.statisticsData).length) {
      return html`<div class="info">
        ${this.hass.localize(
          "ui.components.statistics_charts.no_statistics_found"
        )}
      </div>`;
    }

    return html`
      <ha-chart-base
        .hass=${this.hass}
        .data=${this._chartData}
        .options=${this._chartOptions}
        .chartType=${this.chartType}
      ></ha-chart-base>
    `;
  }

  private _createOptions(unit?: string) {
    this._chartOptions = {
      parsing: false,
      animation: false,
      interaction: {
        mode: "nearest",
        axis: "x",
      },
      scales: {
        x: {
          type: "time",
          adapters: {
            date: {
              locale: this.hass.locale,
            },
          },
          ticks: {
            maxRotation: 0,
            sampleSize: 5,
            autoSkipPadding: 20,
            major: {
              enabled: true,
            },
            font: (context) =>
              context.tick && context.tick.major
                ? ({ weight: "bold" } as any)
                : {},
          },
          time: {
            tooltipFormat: "datetime",
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            maxTicksLimit: 7,
          },
          title: {
            display: unit || this.unit,
            text: unit || this.unit,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${formatNumber(
                context.parsed.y,
                this.hass.locale
              )} ${
                // @ts-ignore
                context.dataset.unit || ""
              }`,
          },
        },
        filler: {
          propagate: true,
        },
        legend: {
          display: !this.hideLegend,
          labels: {
            usePointStyle: true,
          },
        },
      },
      elements: {
        line: {
          tension: 0.4,
          cubicInterpolationMode: "monotone",
          borderWidth: 1.5,
        },
        bar: { borderWidth: 1.5, borderRadius: 4 },
        point: {
          hitRadius: 50,
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
    };
  }

  private _getStatisticsMetaData = memoizeOne(
    async (statisticIds: string[] | undefined) => {
      const statsMetadataArray = await getStatisticMetadata(
        this.hass,
        statisticIds
      );
      const statisticsMetaData = {};
      statsMetadataArray.forEach((x) => {
        statisticsMetaData[x.statistic_id] = x;
      });
      return statisticsMetaData;
    }
  );

  private async _generateData() {
    if (!this.statisticsData) {
      return;
    }

    const statisticsMetaData =
      this.metadata ||
      (await this._getStatisticsMetaData(Object.keys(this.statisticsData)));

    let colorIndex = 0;
    const statisticsData = Object.entries(this.statisticsData);
    const totalDataSets: ChartDataset<"line">[] = [];
    let endTime: Date;

    if (statisticsData.length === 0) {
      return;
    }

    endTime =
      this.endTime ||
      // Get the highest date from the last date of each statistic
      new Date(
        Math.max(
          ...statisticsData.map(([_, stats]) =>
            new Date(stats[stats.length - 1].start).getTime()
          )
        )
      );

    if (endTime > new Date()) {
      endTime = new Date();
    }

    let unit: string | undefined | null;

    const names = this.names || {};
    statisticsData.forEach(([statistic_id, stats]) => {
      const meta = statisticsMetaData?.[statistic_id];
      let name = names[statistic_id];
      if (name === undefined) {
        name = getStatisticLabel(this.hass, statistic_id, meta);
      }

      if (!this.unit) {
        if (unit === undefined) {
          unit = getDisplayUnit(this.hass, statistic_id, meta);
        } else if (
          unit !== null &&
          unit !== getDisplayUnit(this.hass, statistic_id, meta)
        ) {
          // Clear unit if not all statistics have same unit
          unit = null;
        }
      }

      // array containing [value1, value2, etc]
      let prevValues: Array<number | null> | null = null;
      let prevEndTime: Date | undefined;

      // The datasets for the current statistic
      const statDataSets: ChartDataset<"line">[] = [];

      const pushData = (
        start: Date,
        end: Date,
        dataValues: Array<number | null> | null
      ) => {
        if (!dataValues) return;
        if (start > end) {
          // Drop data points that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        statDataSets.forEach((d, i) => {
          if (
            this.chartType === "line" &&
            prevEndTime &&
            prevValues &&
            prevEndTime.getTime() !== start.getTime()
          ) {
            // if the end of the previous data doesn't match the start of the current data,
            // we have to draw a gap so add a value at the end time, and then an empty value.
            d.data.push({ x: prevEndTime.getTime(), y: prevValues[i]! });
            // @ts-expect-error
            d.data.push({ x: prevEndTime.getTime(), y: null });
          }
          d.data.push({ x: start.getTime(), y: dataValues[i]! });
        });
        prevValues = dataValues;
        prevEndTime = end;
      };

      const color = getGraphColorByIndex(
        colorIndex,
        this._computedStyle || getComputedStyle(this)
      );
      colorIndex++;

      const statTypes: this["statTypes"] = [];

      const drawBands =
        this.statTypes.includes("mean") && statisticsHaveType(stats, "mean");

      const sortedTypes = drawBands
        ? [...this.statTypes].sort((a, b) => {
            if (a === "min" || b === "max") {
              return -1;
            }
            if (a === "max" || b === "min") {
              return +1;
            }
            return 0;
          })
        : this.statTypes;

      sortedTypes.forEach((type) => {
        if (statisticsHaveType(stats, statTypeMap[type])) {
          const band = drawBands && (type === "min" || type === "max");
          statTypes.push(type);
          statDataSets.push({
            label: name
              ? `${name} (${this.hass.localize(
                  `ui.components.statistics_charts.statistic_types.${type}`
                )})
            `
              : this.hass.localize(
                  `ui.components.statistics_charts.statistic_types.${type}`
                ),
            fill: drawBands
              ? type === "min"
                ? "+1"
                : type === "max"
                ? "-1"
                : false
              : false,
            borderColor: band ? color + (this.hideLegend ? "00" : "7F") : color,
            backgroundColor: band ? color + "3F" : color + "7F",
            pointRadius: 0,
            data: [],
            // @ts-ignore
            unit: meta?.unit_of_measurement,
            band,
          });
        }
      });

      let prevDate: Date | null = null;
      // Process chart data.
      let firstSum: number | null | undefined = null;
      let prevSum: number | null | undefined = null;
      stats.forEach((stat) => {
        const startDate = new Date(stat.start);
        if (prevDate === startDate) {
          return;
        }
        prevDate = startDate;
        const dataValues: Array<number | null> = [];
        statTypes.forEach((type) => {
          let val: number | null | undefined;
          if (type === "sum") {
            if (firstSum === null || firstSum === undefined) {
              val = 0;
              firstSum = stat.sum;
            } else {
              val = (stat.sum || 0) - firstSum;
            }
          } else if (type === "change") {
            if (prevSum === null || prevSum === undefined) {
              prevSum = stat.sum;
              return;
            }
            val = (stat.sum || 0) - prevSum;
            prevSum = stat.sum;
          } else {
            val = stat[type];
          }
          dataValues.push(
            val !== null && val !== undefined
              ? Math.round(val * 100) / 100
              : null
          );
        });
        pushData(startDate, new Date(stat.end), dataValues);
      });

      // Concat two arrays
      Array.prototype.push.apply(totalDataSets, statDataSets);
    });

    if (unit) {
      this._createOptions(unit);
    }

    this._chartData = {
      datasets: totalDataSets,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        min-height: 60px;
      }
      .info {
        text-align: center;
        line-height: 60px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "statistics-chart": StatisticsChart;
  }
}
