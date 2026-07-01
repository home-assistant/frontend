import type {
  BarSeriesOption,
  LineSeriesOption,
} from "echarts/types/dist/shared";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";

import { formatDate } from "../../common/datetime/format_date";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import {
  formatNumber,
  getNumberFormatOptions,
} from "../../common/number/format_number";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";
import { computeRTL } from "../../common/util/compute_rtl";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticType,
} from "../../data/recorder";
import { getStatisticMetadata, isExternalStatistic } from "../../data/recorder";
import type { HaECOption } from "../../resources/echarts/echarts";
import type { HomeAssistant } from "../../types";
import { getPeriodicAxisLabelConfig } from "./axis-label";
import type { CustomLegendOption } from "./ha-chart-base";
import "./ha-chart-base";
import { sideTooltipPosition } from "./chart-tooltip-position";
import "./ha-chart-tooltip-marker";
import { generateStatisticsChartData } from "./statistics-chart-data";

export const supportedStatTypeMap: Record<StatisticType, StatisticType> = {
  mean: "mean",
  min: "min",
  max: "max",
  sum: "sum",
  state: "sum",
  change: "sum",
};

// When the chart has a single entity, ha-chart-base falls back to raw series
// ids (`${statistic_id}-${type}`) for the legend (see _legendData branch at
// the bottom of _generateData). Strip the type suffix to recover statistic_id.
const STAT_TYPE_SUFFIXES = (
  Object.keys(supportedStatTypeMap) as StatisticType[]
).map((t) => `-${t}`);

@customElement("statistics-chart")
export class StatisticsChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public statisticsData?: Statistics;

  @property({ attribute: false }) public metadata?: Record<
    string,
    StatisticsMetaData
  >;

  @property({ attribute: false }) public names?: Record<string, string>;

  @property({ attribute: false }) public colors?: Record<
    string,
    string | undefined
  >;

  @property() public unit?: string;

  @property({ attribute: false }) public startTime?: Date;

  @property({ attribute: false }) public endTime?: Date;

  @property({ attribute: false })
  public statTypes: StatisticType[] = ["sum", "min", "mean", "max"];

  @property({ attribute: false }) public chartType:
    "line" | "line-stack" | "bar" | "bar-stack" = "line";

  @property({ attribute: false }) public minYAxis?: number;

  @property({ attribute: false }) public maxYAxis?: number;

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

  @property({ attribute: "days-to-show", type: Number })
  public daysToShow?: number;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  @state() private _chartData: (LineSeriesOption | BarSeriesOption)[] = [];

  @state() private _legendData: CustomLegendOption["data"];

  @state() private _statisticIds: string[] = [];

  @state() private _chartOptions?: HaECOption;

  @state() private _hiddenStats = new Set<string>();

  private _computedStyle?: CSSStyleDeclaration;

  private _yAxisFractionDigits = 1;

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return changedProps.size > 1 || !changedProps.has("hass");
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("statisticsData") ||
      changedProps.has("statTypes") ||
      changedProps.has("chartType") ||
      changedProps.has("hideLegend") ||
      changedProps.has("_hiddenStats") ||
      changedProps.has("names")
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
      changedProps.has("hideLegend") ||
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      changedProps.has("_legendData") ||
      changedProps.has("_chartData")
    ) {
      this._createOptions();
    }
  }

  public firstUpdated() {
    this._computedStyle = getComputedStyle(this);
  }

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass.config, "history")) {
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
        .height=${this.height}
        style=${styleMap({ height: this.height })}
        @dataset-hidden=${this._datasetHidden}
        @dataset-unhidden=${this._datasetUnhidden}
        .expandLegend=${this.expandLegend}
        .clickLabelForMoreInfo=${
          this.clickForMoreInfo &&
          !this._statisticIds.every(isExternalStatistic)
        }
        @legend-label-click=${this._handleLegendLabelClick}
      ></ha-chart-base>
    `;
  }

  private _datasetHidden(ev: CustomEvent) {
    this._hiddenStats.add(ev.detail.id);
    this.requestUpdate("_hiddenStats");
  }

  private _datasetUnhidden(ev: CustomEvent) {
    this._hiddenStats.delete(ev.detail.id);
    this.requestUpdate("_hiddenStats");
  }

  private _handleLegendLabelClick(
    ev: HASSDomEvent<HASSDomEvents["legend-label-click"]>
  ) {
    const id = ev.detail.id;
    // External statistics aren't real entities; nothing to open.
    if (isExternalStatistic(id)) {
      return;
    }
    let entityId = id;
    if (!this.hass.states[entityId]) {
      for (const suffix of STAT_TYPE_SUFFIXES) {
        if (id.endsWith(suffix)) {
          entityId = id.slice(0, -suffix.length);
          break;
        }
      }
    }
    if (this.hass.states[entityId]) {
      fireEvent(this, "hass-more-info", { entityId });
    }
  }

  private _renderTooltip = (params: any) => {
    const rendered: Record<string, boolean> = {};
    const chartIsBar = this.chartType.startsWith("bar");
    const period = this.period;
    const unit = this.unit
      ? `${blankBeforeUnit(this.unit, this.hass.locale)}${this.unit}`
      : "";
    const rows: {
      time?: string;
      color: string;
      seriesName?: string;
      value: string;
    }[] = [];
    for (const param of params) {
      if (rendered[param.seriesIndex]) continue;
      rendered[param.seriesIndex] = true;

      const statisticId = this._statisticIds[param.seriesIndex];
      const stateObj = this.hass.states[statisticId];
      const entry = this.hass.entities[statisticId];
      let rawValue: string;
      let rawTime: string;
      if (chartIsBar) {
        // For bar charts value is always second value.
        rawValue = String(param.value[1]);
        // Time value is third value (un-shifted date) if given, otherwise first value
        let startTime: Date;
        let endTime: Date | undefined;
        if (param.value[2]) {
          startTime = new Date(param.value[2]);
          if (param.value[3]) {
            endTime = new Date(param.value[3]);
          }
        } else {
          startTime = new Date(param.value[0]);
        }
        if (
          period === "year" ||
          period === "month" ||
          period === "week" ||
          period === "day"
        ) {
          // For year/month/day periods, show only the date
          rawTime =
            formatDate(startTime, this.hass.locale, this.hass.config) +
            (endTime && period !== "day"
              ? ` – ${formatDate(endTime, this.hass.locale, this.hass.config)}`
              : "");
        } else {
          // For other time periods, include time in render, and optionally show range
          // if we have an end time.
          rawTime =
            formatDateTimeWithSeconds(
              startTime,
              this.hass.locale,
              this.hass.config
            ) +
            (endTime
              ? ` – ${formatTimeWithSeconds(
                  endTime,
                  this.hass.locale,
                  this.hass.config
                )}`
              : "");
        }
      } else {
        // For lines max series can have 3 values, as the second value is the max-min to form a band
        rawValue = String(param.value[2] ?? param.value[1]);
        // Time value is always first value
        rawTime = formatDateTimeWithSeconds(
          new Date(param.value[0]),
          this.hass.locale,
          this.hass.config
        );
      }

      const options = getNumberFormatOptions(stateObj, entry) ?? {
        maximumFractionDigits: 2,
      };

      const value = `${formatNumber(rawValue, this.hass.locale, options)}${unit}`;

      rows.push({
        time: rows.length === 0 ? rawTime : undefined,
        color: String(param.color ?? ""),
        seriesName: param.seriesName,
        value,
      });
    }

    if (rows.length === 0) return nothing;

    return html`${rows.map(
      (row, i) =>
        html`${
            row.time ? html`${row.time}<br />` : nothing
          }<ha-chart-tooltip-marker
            .color=${row.color}
          ></ha-chart-tooltip-marker>
          ${row.seriesName}:
          ${row.value}${i < rows.length - 1 ? html`<br />` : nothing}`
    )}`;
  };

  private _createOptions() {
    const dayDifference = this.daysToShow ?? 1;
    let minYAxis: number | ((values: { min: number }) => number) | undefined =
      this.minYAxis;
    let maxYAxis: number | ((values: { max: number }) => number) | undefined =
      this.maxYAxis;
    if (typeof minYAxis === "number") {
      if (this.fitYData) {
        minYAxis = ({ min }) =>
          Math.min(this._roundYAxis(min, Math.floor), this.minYAxis!);
      }
    } else if (this.logarithmicScale) {
      minYAxis = ({ min }) => {
        const value = min > 0 ? min * 0.95 : min * 1.05;
        return this._roundYAxis(value, Math.floor);
      };
    }
    if (typeof maxYAxis === "number") {
      if (this.fitYData) {
        maxYAxis = ({ max }) =>
          Math.max(this._roundYAxis(max, Math.ceil), this.maxYAxis!);
      }
    } else if (this.logarithmicScale) {
      maxYAxis = ({ max }) => {
        const value = max > 0 ? max * 1.05 : max * 0.95;
        return this._roundYAxis(value, Math.ceil);
      };
    }
    const endTime = this.endTime ?? new Date();
    let startTime = this.startTime;

    if (!startTime) {
      // set start time to the earliest point in the chart data
      this._chartData.forEach((series) => {
        if (!Array.isArray(series.data) || !series.data[0]) return;
        const firstPoint = series.data[0] as any;
        const timestamp = Array.isArray(firstPoint)
          ? firstPoint[0]
          : firstPoint.value?.[0];
        if (timestamp && (!startTime || new Date(timestamp) < startTime)) {
          startTime = new Date(timestamp);
        }
      });

      if (!startTime) {
        // Calculate default start time based on dayDifference
        startTime = new Date(
          endTime.getTime() - dayDifference * 24 * 3600 * 1000
        );
      }
    }

    this._chartOptions = {
      xAxis: [
        {
          id: "xAxis",
          type: "time",
          min: startTime,
          max: this.endTime,
          ...(this.period === "month" && {
            minInterval: 28 * 24 * 3600 * 1000,
            axisLabel: getPeriodicAxisLabelConfig(
              "month",
              this.hass.locale,
              this.hass.config
            ),
          }),
          ...(this.period === "year" && {
            minInterval: 365 * 24 * 3600 * 1000,
            axisLabel: getPeriodicAxisLabelConfig(
              "year",
              this.hass.locale,
              this.hass.config
            ),
          }),
        },
        {
          id: "hiddenAxis",
          type: "time",
          show: false,
        },
      ],
      yAxis: {
        type: this.logarithmicScale ? "log" : "value",
        name: this.unit,
        nameGap: 2,
        nameTextStyle: {
          align: "left",
        },
        position: computeRTL(
          this.hass.language,
          this.hass.translationMetadata.translations
        )
          ? "right"
          : "left",
        scale:
          this.chartType.startsWith("line") ||
          this.logarithmicScale ||
          minYAxis !== undefined ||
          maxYAxis !== undefined,
        min: this._clampYAxis(minYAxis),
        max: this._clampYAxis(maxYAxis),
        splitLine: {
          show: true,
        },
        axisLabel: {
          formatter: this._formatYAxisLabel,
        } as any,
      },
      legend: {
        type: "custom",
        show: !this.hideLegend,
        data: this._legendData,
      },
      grid: {
        top: 15,
        left: 1,
        right: 1,
        bottom: 0,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        renderMode: "html",
        position: sideTooltipPosition,
        confine: true,
        formatter: this._renderTooltip,
      },
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

    const data = generateStatisticsChartData({
      hass: this.hass,
      statisticsData: this.statisticsData,
      statisticsMetaData,
      names: this.names,
      colors: this.colors,
      unit: this.unit,
      endTime: this.endTime,
      statTypes: this.statTypes,
      chartType: this.chartType,
      period: this.period,
      hideLegend: this.hideLegend,
      hiddenStats: this._hiddenStats,
      computedStyle: this._computedStyle || getComputedStyle(this),
      now: new Date(),
    });

    if (!data) {
      return;
    }

    this.unit = data.unit;
    this._yAxisFractionDigits = data.yAxisFractionDigits;
    this._chartData = data.datasets;
    if (data.legendData.length !== this._legendData?.length) {
      // only update the legend if it has changed or it will trigger options update
      this._legendData =
        data.legendData.length > 1
          ? data.legendData.map(({ id, name, noLabelClick }) => ({
              id,
              name,
              noLabelClick,
            }))
          : // if there is only one entity, let the base chart handle the legend
            undefined;
    }
    this._statisticIds = data.statisticIds;
  }

  private _clampYAxis(value?: number | ((values: any) => number)) {
    if (this.logarithmicScale) {
      // log(0) is -Infinity, so we need to set a minimum value
      if (typeof value === "number") {
        return Math.max(value, Number.EPSILON);
      }
      if (typeof value === "function") {
        return (values: any) => Math.max(value(values), Number.EPSILON);
      }
    }
    return value;
  }

  private _roundYAxis(value: number, roundingFn: (value: number) => number) {
    return Math.abs(value) < 1 ? value : roundingFn(value);
  }

  private _formatYAxisLabel = (value: number) =>
    formatNumber(value, this.hass.locale, {
      minimumFractionDigits: value === 0 ? 0 : this._yAxisFractionDigits,
      maximumFractionDigits: this._yAxisFractionDigits,
    });

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
