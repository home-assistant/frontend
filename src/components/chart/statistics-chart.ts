import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LineSeriesOption } from "echarts/types/dist/shared";
import { getGraphColorByIndex } from "../../common/color/colors";
import { isComponentLoaded } from "../../common/config/is_component_loaded";

import type {
  Statistics,
  StatisticsMetaData,
  StatisticType,
} from "../../data/recorder";
import {
  getDisplayUnit,
  getStatisticLabel,
  getStatisticMetadata,
  statisticsHaveType,
} from "../../data/recorder";
import type { HomeAssistant } from "../../types";
import "./ha-chart-base";
import { formatTime } from "../../common/datetime/format_time";
import { formatDateVeryShort } from "../../common/datetime/format_date";
import { computeRTL } from "../../common/util/compute_rtl";
import type { ECOption } from "../../resources/echarts";
import {
  formatNumber,
  getNumberFormatOptions,
} from "../../common/number/format_number";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";

export const supportedStatTypeMap: Record<StatisticType, StatisticType> = {
  mean: "mean",
  min: "min",
  max: "max",
  sum: "sum",
  state: "sum",
  change: "sum",
};

@customElement("statistics-chart")
export class StatisticsChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public statisticsData?: Statistics;

  @property({ attribute: false }) public metadata?: Record<
    string,
    StatisticsMetaData
  >;

  @property({ attribute: false }) public names?: Record<string, string>;

  @property() public unit?: string;

  @property({ attribute: false }) public endTime?: Date;

  @property({ attribute: false, type: Array })
  public statTypes: StatisticType[] = ["sum", "min", "mean", "max"];

  @property({ attribute: false }) public chartType: "line" | "bar" = "line";

  @property({ attribute: false, type: Number }) public minYAxis?: number;

  @property({ attribute: false, type: Number }) public maxYAxis?: number;

  @property({ attribute: "fit-y-data", type: Boolean }) public fitYData = false;

  @property({ attribute: "hide-legend", type: Boolean }) public hideLegend =
    false;

  @property({ attribute: "logarithmic-scale", type: Boolean })
  public logarithmicScale = false;

  @property({ attribute: "is-loading-data", type: Boolean })
  public isLoadingData = false;

  @property({ attribute: "click-for-more-info", type: Boolean })
  public clickForMoreInfo = true;

  @property() public period?: string;

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _legendData: string[] = [];

  @state() private _statisticIds: string[] = [];

  @state() private _chartOptions?: ECOption;

  private _computedStyle?: CSSStyleDeclaration;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return changedProps.size > 1 || !changedProps.has("hass");
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("statisticsData") ||
      changedProps.has("statTypes") ||
      changedProps.has("chartType") ||
      changedProps.has("hideLegend")
    ) {
      this._generateData();
    }
    if (
      !this.hasUpdated ||
      changedProps.has("unit") ||
      changedProps.has("period") ||
      changedProps.has("chartType") ||
      changedProps.has("minYAxis") ||
      changedProps.has("maxYAxis") ||
      changedProps.has("fitYData") ||
      changedProps.has("logarithmicScale") ||
      changedProps.has("hideLegend")
    ) {
      this._createOptions();
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
      ></ha-chart-base>
    `;
  }

  private _renderTooltip(params: any) {
    return params
      .map((param, index: number) => {
        const value = `${formatNumber(
          // max series has 3 values, as the second value is the max-min to form a band
          (param.value[2] ?? param.value[1]) as number,
          this.hass.locale,
          getNumberFormatOptions(
            undefined,
            this.hass.entities[this._statisticIds[param.seriesIndex]]
          )
        )} ${this.unit}`;

        const time =
          index === 0
            ? formatDateTimeWithSeconds(
                new Date(param.value[0]),
                this.hass.locale,
                this.hass.config
              ) + "<br>"
            : "";
        return `${time}${param.marker} ${param.seriesName}: ${value}
      `;
      })
      .join("<br>");
  }

  private _createOptions() {
    const splitLineStyle = this.hass.themes?.darkMode ? { opacity: 0.15 } : {};
    this._chartOptions = {
      xAxis: {
        type: "time",
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            // show only date for the beginning of the day
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return `{day|${formatDateVeryShort(date, this.hass.locale, this.hass.config)}}`;
            }
            return formatTime(date, this.hass.locale, this.hass.config);
          },
          rich: {
            day: {
              fontWeight: "bold",
            },
          },
        },
        axisLine: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: splitLineStyle,
        },
      },
      yAxis: {
        type: this.logarithmicScale ? "log" : "value",
        name: this.unit,
        position: computeRTL(this.hass) ? "right" : "left",
        // @ts-ignore
        scale: this.chartType !== "bar",
        min: this.fitYData ? undefined : this.minYAxis,
        max: this.fitYData ? undefined : this.maxYAxis,
        splitLine: {
          show: true,
          lineStyle: splitLineStyle,
        },
      },
      legend: {
        show: !this.hideLegend,
        icon: "circle",
        padding: [20, 0],
        data: this._legendData,
      },
      grid: {
        ...(this.hideLegend ? { top: this.unit ? 30 : 5 } : {}), // undefined is the same as 0
        left: 20,
        right: 1,
        bottom: 0,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        appendTo: document.body,
        formatter: this._renderTooltip.bind(this),
      },
      // scales: {
      //   x: {
      //     ticks: {
      //       source: this.chartType === "bar" ? "data" : undefined,
      //     },
      //     time: {
      //       tooltipFormat: "datetime",
      //       unit:
      //         this.chartType === "bar" &&
      //         this.period &&
      //         ["hour", "day", "week", "month"].includes(this.period)
      //           ? this.period
      //           : undefined,
      //     },
      //   },
      //   y: {
      //     beginAtZero: this.chartType === "bar",
      //   },
      // },
      // elements: {
      //   bar: { borderWidth: 1.5, borderRadius: 4 },
      // },
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
    const totalDataSets: LineSeriesOption[] = [];
    const legendData: string[] = [];
    const statisticIds: string[] = [];
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
      let prevValues: (number | null)[][] | null = null;
      let prevEndTime: Date | undefined;

      // The datasets for the current statistic
      const statDataSets: LineSeriesOption[] = [];
      const statLegendData: string[] = [];

      const pushData = (
        start: Date,
        end: Date,
        dataValues: (number | null)[][]
      ) => {
        if (!dataValues.length) return;
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
            d.data!.push([prevEndTime, ...prevValues[i]!]);
            d.data!.push([prevEndTime, null]);
          }
          d.data!.push([start, ...dataValues[i]!]);
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

      const hasMean =
        this.statTypes.includes("mean") && statisticsHaveType(stats, "mean");
      const drawBands =
        hasMean ||
        (this.statTypes.includes("min") &&
          statisticsHaveType(stats, "min") &&
          this.statTypes.includes("max") &&
          statisticsHaveType(stats, "max"));

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

      let displayedLegend = false;
      sortedTypes.forEach((type) => {
        if (statisticsHaveType(stats, type)) {
          const band = drawBands && (type === "min" || type === "max");
          if (!this.hideLegend) {
            const showLegend = hasMean
              ? type === "mean"
              : displayedLegend === false;
            if (showLegend) {
              statLegendData.push(name);
            }
            displayedLegend = displayedLegend || showLegend;
          }
          statTypes.push(type);
          const series: LineSeriesOption = {
            type: this.chartType,
            data: [],
            name: name
              ? `${name} (${this.hass.localize(
                  `ui.components.statistics_charts.statistic_types.${type}`
                )})
            `
              : this.hass.localize(
                  `ui.components.statistics_charts.statistic_types.${type}`
                ),
            symbol: "circle",
            symbolSize: 0,
            lineStyle: {
              width: 1.5,
            },
            color: band && hasMean ? color + "3F" : color,
          };
          if (band) {
            series.stack = "band";
            series.symbol = "none";
            series.lineStyle = {
              opacity: 0,
            };
            if (drawBands && type === "max") {
              series.areaStyle = {
                color: color + "3F",
              };
            }
          }
          statDataSets.push(series);
          statisticIds.push(statistic_id);
        }
      });

      let prevDate: Date | null = null;
      // Process chart data.
      let firstSum: number | null | undefined = null;
      stats.forEach((stat) => {
        const startDate = new Date(stat.start);
        if (prevDate === startDate) {
          return;
        }
        prevDate = startDate;
        const dataValues: (number | null)[][] = [];
        statTypes.forEach((type) => {
          const val: (number | null)[] = [];
          if (type === "sum") {
            if (firstSum === null || firstSum === undefined) {
              val.push(0);
              firstSum = stat.sum;
            } else {
              val.push((stat.sum || 0) - firstSum);
            }
          } else if (type === "max") {
            const max = stat.max || 0;
            val.push(max - (stat.min || 0));
            val.push(max);
          } else {
            val.push(stat[type] ?? null);
          }
          dataValues.push(val);
        });
        pushData(startDate, new Date(stat.end), dataValues);
      });

      // Concat two arrays
      Array.prototype.push.apply(totalDataSets, statDataSets);
      Array.prototype.push.apply(legendData, statLegendData);
    });

    if (unit) {
      this.unit = unit;
    }

    this._chartData = totalDataSets;
    this._legendData = legendData;
    this._statisticIds = statisticIds;
  }

  static styles = css`
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

declare global {
  interface HTMLElementTagNameMap {
    "statistics-chart": StatisticsChart;
  }
}
