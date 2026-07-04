import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { VisualMapComponentOption } from "echarts/components";
import type { LineSeriesOption } from "echarts/charts";
import type { YAXisOption } from "echarts/types/dist/shared";
import { styleMap } from "lit/directives/style-map";
import { computeRTL } from "../../common/util/compute_rtl";

import type { LineChartEntity } from "../../data/history";
import type { HomeAssistant } from "../../types";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";
import { sideTooltipPosition } from "./chart-tooltip-position";
import "./ha-chart-tooltip-marker";
import {
  CLIMATE_MODE_CONFIGS,
  generateStateHistoryChartLineData,
} from "./state-history-chart-line-data";
import type { HaECOption } from "../../resources/echarts/echarts";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import {
  getNumberFormatOptions,
  formatNumber,
} from "../../common/number/format_number";
import { measureTextWidth } from "../../util/text";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";
import { computeAttributeValueDisplay } from "../../common/entity/compute_attribute_display";

// Used to recover the underlying entity_id from a legend dataset id.
// Kept in sync with the suffixes appended at dataset construction below
// for climate / water_heater / humidifier multi-attribute charts.
const ENTITY_DATASET_SUFFIXES = [
  "-current_temperature",
  "-target_temperature",
  "-target_temperature_mode",
  "-target_temperature_mode_low",
  ...CLIMATE_MODE_CONFIGS.map((c) => `-${c.action}`),
  "-current_humidity",
  "-target_humidity",
  "-humidifying",
  "-on",
];

@customElement("state-history-chart-line")
export class StateHistoryChartLine extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: LineChartEntity[] = [];

  @property({ attribute: false }) public names?: Record<string, string>;

  @property({ attribute: false }) public colors?: Record<
    string,
    string | undefined
  >;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ attribute: "show-names", type: Boolean })
  public showNames = true;

  @property({ attribute: "click-for-more-info", type: Boolean })
  public clickForMoreInfo = true;

  @property({ attribute: false }) public startTime!: Date;

  @property({ attribute: false }) public endTime!: Date;

  @property({ attribute: false }) public paddingYAxis = 0;

  @property({ attribute: false }) public chartIndex?;

  @property({ attribute: "logarithmic-scale", type: Boolean })
  public logarithmicScale = false;

  @property({ attribute: false }) public minYAxis?: number;

  @property({ attribute: false }) public maxYAxis?: number;

  @property({ attribute: "fit-y-data", type: Boolean }) public fitYData = false;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  @property({ attribute: "hide-reset-button", type: Boolean })
  public hideResetButton?: boolean;

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _entityIds: string[] = [];

  private _datasetToDataIndex: number[] = [];

  @state() private _chartOptions?: HaECOption;

  private _hiddenStats = new Set<string>();

  @state() private _yWidth = 25;

  @state() private _visualMap?: VisualMapComponentOption[];

  private _chartTime: Date = new Date();

  private _yAxisFractionDigits = 1;

  protected render() {
    return html`
      <ha-chart-base
        .hass=${this.hass}
        .data=${this._chartData}
        .options=${this._chartOptions}
        .height=${this.height}
        style=${styleMap({ height: this.height })}
        @dataset-hidden=${this._datasetHidden}
        @dataset-unhidden=${this._datasetUnhidden}
        @chart-zoom=${this._handleDataZoom}
        .expandLegend=${this.expandLegend}
        .hideResetButton=${this.hideResetButton}
        .clickLabelForMoreInfo=${this.clickForMoreInfo}
        @legend-label-click=${this._handleLegendLabelClick}
      ></ha-chart-base>
    `;
  }

  private _renderTooltip = (params: any) => {
    const time = params[0].axisValue;
    const title = formatDateTimeWithSeconds(
      new Date(time),
      this.hass.locale,
      this.hass.config
    );
    const datapoints: Record<string, any>[] = [];
    // Index the hovered points by series so the per-dataset lookup below is
    // O(1) instead of scanning `params` for every dataset on each mouse move.
    const paramsBySeriesIndex = new Map<number, Record<string, any>>();
    for (const p of params) {
      if (!paramsBySeriesIndex.has(p.seriesIndex)) {
        paramsBySeriesIndex.set(p.seriesIndex, p);
      }
    }
    this._chartData.forEach((dataset, index) => {
      if (
        dataset.tooltip?.show === false ||
        this._hiddenStats.has(dataset.id as string)
      ) {
        return;
      }
      const param = paramsBySeriesIndex.get(index);
      if (param) {
        datapoints.push(param);
        return;
      }
      // If the datapoint is not found, we need to find the last datapoint before the current time
      let lastData: any;
      const data = dataset.data || [];
      for (let i = data.length - 1; i >= 0; i--) {
        const point = data[i];
        if (point && point[0] <= time && typeof point[1] === "number") {
          lastData = point;
          break;
        }
      }
      if (!lastData) return;
      datapoints.push({
        seriesName: dataset.name,
        seriesIndex: index,
        value: lastData,
        color: dataset.color,
      });
    });
    const unit = this.unit
      ? `${blankBeforeUnit(this.unit, this.hass.locale)}${this.unit}`
      : "";

    return html`${title}${datapoints.map((param) => {
      const entityId = this._entityIds[param.seriesIndex];
      const stateObj = this.hass.states[entityId];
      const entry = this.hass.entities[entityId];
      const stateValue = String(param.value[1]);
      const value = stateObj
        ? this.hass.formatEntityState(stateObj, stateValue)
        : `${formatNumber(
            stateValue,
            this.hass.locale,
            getNumberFormatOptions(undefined, entry)
          )}${unit}`;
      const dataIndex = this._datasetToDataIndex[param.seriesIndex];
      const data = this.data[dataIndex];
      let statSuffix: TemplateResult | typeof nothing = nothing;
      if (data.statistics && data.statistics.length > 0) {
        const source =
          data.states.length === 0 ||
          param.value[0] < data.states[0].last_changed
            ? this.hass.localize("ui.components.history_charts.source_stats")
            : this.hass.localize("ui.components.history_charts.source_history");
        // Five non-breaking spaces indent the source label.
        statSuffix = html`<br />${"\u00a0".repeat(5)}${source}`;
      }
      return html`<br /><ha-chart-tooltip-marker
          .color=${String(param.color ?? "")}
        ></ha-chart-tooltip-marker>
        ${
          param.seriesName ? html`${param.seriesName}: ` : nothing
        }${value}${statSuffix}`;
    })}`;
  };

  private _datasetHidden(ev: CustomEvent) {
    this._hiddenStats.add(ev.detail.id);
  }

  private _datasetUnhidden(ev: CustomEvent) {
    this._hiddenStats.delete(ev.detail.id);
  }

  public zoom(start: number, end: number) {
    const chartBase = this.shadowRoot!.querySelector("ha-chart-base")!;
    chartBase.zoom(start, end, true);
  }

  private _handleDataZoom(ev: CustomEvent) {
    fireEvent(this, "chart-zoom-with-index", {
      start: ev.detail.start ?? 0,
      end: ev.detail.end ?? 100,
      chartIndex: this.chartIndex,
    });
  }

  private _handleLegendLabelClick(
    ev: HASSDomEvent<HASSDomEvents["legend-label-click"]>
  ) {
    const id = ev.detail.id;
    let entityId = id;
    if (!this.hass.states[entityId]) {
      for (const suffix of ENTITY_DATASET_SUFFIXES) {
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

  public willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("data") ||
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      this._chartTime <
        new Date(this.endTime.getTime() - MIN_TIME_BETWEEN_UPDATES)
    ) {
      // If the line is more than 5 minutes old, re-gen it
      // so the X axis grows even if there is no new data
      this._generateData();
    }

    if (
      !this.hasUpdated ||
      changedProps.has("showNames") ||
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      changedProps.has("unit") ||
      changedProps.has("logarithmicScale") ||
      changedProps.has("minYAxis") ||
      changedProps.has("maxYAxis") ||
      changedProps.has("fitYData") ||
      changedProps.has("paddingYAxis") ||
      changedProps.has("_visualMap") ||
      changedProps.has("_yWidth") ||
      (changedProps.has("hass") &&
        this._hasEntityStatesChanged(changedProps.get("hass")))
    ) {
      const rtl = computeRTL(
        this.hass.language,
        this.hass.translationMetadata.translations
      );
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
      this._chartOptions = {
        xAxis: {
          type: "time",
          min: this.startTime,
          max: this.endTime,
        },
        yAxis: {
          type: this.logarithmicScale ? "log" : "value",
          name: this.unit,
          min: this._clampYAxis(minYAxis),
          max: this._clampYAxis(maxYAxis),
          position: rtl ? "right" : "left",
          scale: true,
          nameGap: 2,
          nameTextStyle: {
            align: "left",
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            margin: 5,
            formatter: this._formatYAxisLabel,
          },
        } as YAXisOption,
        legend: {
          type: "custom",
          show: this.showNames,
          data: this._chartData
            .map((d, i) => ({ dataset: d, entityId: this._entityIds[i] }))
            .filter((item) => !(item.dataset as LineSeriesOption).areaStyle)
            .map((item) => {
              const stateObj = this.hass.states[item.entityId];
              let value: string | undefined;

              if (stateObj) {
                // For climate temperature datasets, show temperature values
                const datasetId = item.dataset.id as string;
                if (
                  datasetId?.endsWith("-current_temperature") ||
                  datasetId?.endsWith("-target_temperature") ||
                  datasetId?.endsWith("-target_temperature_mode") ||
                  datasetId?.endsWith("-target_temperature_mode_low")
                ) {
                  let attribute: string | undefined;
                  if (datasetId.endsWith("-current_temperature")) {
                    attribute = "current_temperature";
                  } else if (
                    datasetId.endsWith("-target_temperature_mode_low")
                  ) {
                    attribute = "target_temp_low";
                  } else if (datasetId.endsWith("-target_temperature_mode")) {
                    attribute = "target_temp_high";
                  } else {
                    attribute = "temperature";
                  }
                  // Use the helper to format temperature with proper unit
                  value = computeAttributeValueDisplay(
                    this.hass.localize,
                    stateObj,
                    this.hass.locale,
                    this.hass.config,
                    this.hass.entities,
                    attribute
                  );
                }

                // Default for non-temperature datasets / missing attribute
                if (value === undefined) {
                  value = this.hass.formatEntityState(stateObj);
                }
              }

              return {
                id: item.dataset.id as string,
                name: item.dataset.name as string,
                value: value,
              };
            }),
        },
        grid: {
          top: 15,
          left: rtl ? 1 : Math.max(this.paddingYAxis, this._yWidth),
          right: rtl ? Math.max(this.paddingYAxis, this._yWidth) : 1,
          bottom: 20,
        },
        visualMap: this._visualMap,
        tooltip: {
          trigger: "axis",
          renderMode: "html",
          position: sideTooltipPosition,
          confine: true,
          formatter: this._renderTooltip,
        },
      };
    }
  }

  private _hasEntityStatesChanged(oldHass: HomeAssistant): boolean {
    return this._entityIds.some(
      (entityId) =>
        this.hass.states[entityId]?.state !== oldHass.states[entityId]?.state
    );
  }

  private _generateData() {
    if (this.data.length === 0) {
      return;
    }

    this._chartTime = new Date();

    const data = generateStateHistoryChartLineData({
      hass: this.hass,
      data: this.data,
      endTime: this.endTime,
      names: this.names,
      colors: this.colors,
      showNames: this.showNames,
      computedStyles: getComputedStyle(this),
      now: new Date(),
    });

    if (!data) {
      return;
    }

    this._yAxisFractionDigits = data.yAxisFractionDigits;
    this._chartData = data.datasets;
    this._entityIds = data.entityIds;
    this._datasetToDataIndex = data.datasetToDataIndex;
    this._visualMap = data.visualMap;
  }

  private _formatYAxisLabel = (value: number) => {
    const label = formatNumber(value, this.hass.locale, {
      minimumFractionDigits: value === 0 ? 0 : this._yAxisFractionDigits,
      maximumFractionDigits: this._yAxisFractionDigits,
    });
    const width = measureTextWidth(label, 12) + 5;
    if (width > this._yWidth) {
      this._yWidth = width;
      fireEvent(this, "y-width-changed", {
        value: this._yWidth,
        chartIndex: this.chartIndex,
      });
    }
    return label;
  };

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
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-line": StateHistoryChartLine;
  }
}
