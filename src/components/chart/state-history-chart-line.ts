import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import type { VisualMapComponentOption } from "echarts/components";
import type { LineSeriesOption } from "echarts/charts";
import type { YAXisOption } from "echarts/types/dist/shared";
import { styleMap } from "lit/directives/style-map";
import { getGraphColorByIndex } from "../../common/color/colors";
import { computeRTL } from "../../common/util/compute_rtl";

import type { LineChartEntity, LineChartState } from "../../data/history";
import type { HomeAssistant } from "../../types";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";
import type { ECOption } from "../../resources/echarts";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import {
  getNumberFormatOptions,
  formatNumber,
} from "../../common/number/format_number";
import { measureTextWidth } from "../../util/text";
import { fireEvent } from "../../common/dom/fire_event";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../data/climate";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";

const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : null;
};

export class StateHistoryChartLine extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: LineChartEntity[] = [];

  @property({ attribute: false }) public names?: Record<string, string>;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ attribute: "show-names", type: Boolean })
  public showNames = true;

  @property({ attribute: "click-for-more-info", type: Boolean })
  public clickForMoreInfo = true;

  @property({ attribute: false }) public startTime!: Date;

  @property({ attribute: false }) public endTime!: Date;

  @property({ attribute: false, type: Number }) public paddingYAxis = 0;

  @property({ attribute: false, type: Number }) public chartIndex?;

  @property({ attribute: "logarithmic-scale", type: Boolean })
  public logarithmicScale = false;

  @property({ attribute: false, type: Number }) public minYAxis?: number;

  @property({ attribute: false, type: Number }) public maxYAxis?: number;

  @property({ attribute: "fit-y-data", type: Boolean }) public fitYData = false;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  @state() private _chartData: LineSeriesOption[] = [];

  @state() private _entityIds: string[] = [];

  private _datasetToDataIndex: number[] = [];

  @state() private _chartOptions?: ECOption;

  private _hiddenStats = new Set<string>();

  @state() private _yWidth = 25;

  @state() private _visualMap?: VisualMapComponentOption[];

  private _chartTime: Date = new Date();

  private _previousYAxisLabelValue = 0;

  @property({ attribute: false }) public zoomStatus?: {
    start: number;
    end: number;
  };

  private _lastZoomStatus?: { start: number; end: number };

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
        .expandLegend=${this.expandLegend}
        @zoom-status-changed=${this._zoomStatusChanged}
        .zoomStatus=${this.zoomStatus}
      ></ha-chart-base>
    `;
  }

  private _zoomStatusChanged = (ev: CustomEvent) => {
    // Only propagate if changed
    if (
      ev.detail.start !== this._lastZoomStatus?.start ||
      ev.detail.end !== this._lastZoomStatus?.end
    ) {
      this._lastZoomStatus = ev.detail;
      fireEvent(this, "zoom-status-changed", ev.detail);
    }
  };

  private _renderTooltip = (params: any) => {
    const time = params[0].axisValue;
    const title =
      formatDateTimeWithSeconds(
        new Date(time),
        this.hass.locale,
        this.hass.config
      ) + "<br>";
    const datapoints: Record<string, any>[] = [];
    this._chartData.forEach((dataset, index) => {
      if (
        dataset.tooltip?.show === false ||
        this._hiddenStats.has(dataset.id as string)
      )
        return;
      const param = params.find(
        (p: Record<string, any>) => p.seriesIndex === index
      );
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
        // HTML copied from echarts. May change based on options
        marker: `<span style="display:inline-block;margin-right:4px;margin-inline-end:4px;margin-inline-start:initial;border-radius:10px;width:10px;height:10px;background-color:${dataset.color};"></span>`,
      });
    });
    const unit = this.unit
      ? `${blankBeforeUnit(this.unit, this.hass.locale)}${this.unit}`
      : "";

    return (
      title +
      datapoints
        .map((param) => {
          const entityId = this._entityIds[param.seriesIndex];
          const stateObj = this.hass.states[entityId];
          const entry = this.hass.entities[entityId];
          const stateValue = String(param.value[1]);
          let value = stateObj
            ? this.hass.formatEntityState(stateObj, stateValue)
            : `${formatNumber(
                stateValue,
                this.hass.locale,
                getNumberFormatOptions(undefined, entry)
              )}${unit}`;
          const dataIndex = this._datasetToDataIndex[param.seriesIndex];
          const data = this.data[dataIndex];
          if (data.statistics && data.statistics.length > 0) {
            value += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
            const source =
              data.states.length === 0 ||
              param.value[0] < data.states[0].last_changed
                ? `${this.hass.localize(
                    "ui.components.history_charts.source_stats"
                  )}`
                : `${this.hass.localize(
                    "ui.components.history_charts.source_history"
                  )}`;
            value += source;
          }

          if (param.seriesName) {
            return `${param.marker} ${param.seriesName}: ${value}`;
          }
          return `${param.marker} ${value}`;
        })
        .join("<br>")
    );
  };

  private _datasetHidden(ev: CustomEvent) {
    this._hiddenStats.add(ev.detail.id);
  }

  private _datasetUnhidden(ev: CustomEvent) {
    this._hiddenStats.delete(ev.detail.id);
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
      changedProps.has("_yWidth")
    ) {
      const rtl = computeRTL(this.hass);
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
          appendTo: document.body,
          formatter: this._renderTooltip,
        },
      };
    }

    if (changedProps.has("zoomStatus") && this.zoomStatus && this.chart) {
      // Prevent feedback loop: only update if different from last applied
      if (
        !this._lastZoomStatus ||
        this._lastZoomStatus.start !== this.zoomStatus.start ||
        this._lastZoomStatus.end !== this.zoomStatus.end
      ) {
        this.chart.dispatchAction({
          type: "dataZoom",
          start: this.zoomStatus.start,
          end: this.zoomStatus.end,
        });
        this._lastZoomStatus = { ...this.zoomStatus };
      }
    }
  }

  private _generateData() {
    let colorIndex = 0;
    const computedStyles = getComputedStyle(this);
    const entityStates = this.data;
    const datasets: LineSeriesOption[] = [];
    const entityIds: string[] = [];
    const datasetToDataIndex: number[] = [];
    if (entityStates.length === 0) {
      return;
    }

    this._chartTime = new Date();
    const endTime = this.endTime;
    const names = this.names || {};
    entityStates.forEach((states, dataIdx) => {
      const domain = states.domain;
      const name = names[states.entity_id] || states.name;
      // array containing [value1, value2, etc]
      let prevValues: any[] | null = null;

      const data: LineSeriesOption[] = [];

      const pushData = (timestamp: Date, datavalues: any[] | null) => {
        if (!datavalues) return;
        if (timestamp > endTime) {
          // Drop data points that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        data.forEach((d, i) => {
          if (datavalues[i] === null && prevValues && prevValues[i] !== null) {
            // null data values show up as gaps in the chart.
            // If the current value for the dataset is null and the previous
            // value of the data set is not null, then add an 'end' point
            // to the chart for the previous value. Otherwise the gap will
            // be too big. It will go from the start of the previous data
            // value until the start of the next data value.
            d.data!.push([timestamp, prevValues[i]]);
          }
          d.data!.push([timestamp, datavalues[i]]);
        });
        prevValues = datavalues;
      };

      const addDataSet = (
        id: string,
        nameY: string,
        color?: string,
        fill = false
      ) => {
        if (!color) {
          color = getGraphColorByIndex(colorIndex, computedStyles);
          colorIndex++;
        }
        data.push({
          id,
          data: [],
          type: "line",
          cursor: "default",
          name: nameY,
          color,
          symbol: "circle",
          symbolSize: 1,
          step: "end",
          sampling: "minmax",
          animationDurationUpdate: 0,
          lineStyle: {
            width: fill ? 0 : 1.5,
          },
          areaStyle: fill
            ? {
                color: color + "7F",
              }
            : undefined,
          tooltip: {
            show: !fill,
          },
        });
        entityIds.push(states.entity_id);
        datasetToDataIndex.push(dataIdx);
      };

      if (
        domain === "thermostat" ||
        domain === "climate" ||
        domain === "water_heater"
      ) {
        const hasHvacAction = states.states.some(
          (entityState) => entityState.attributes?.hvac_action
        );

        const isHeating =
          domain === "climate" && hasHvacAction
            ? (entityState: LineChartState) =>
                CLIMATE_HVAC_ACTION_TO_MODE[
                  entityState.attributes?.hvac_action
                ] === "heat"
            : (entityState: LineChartState) => entityState.state === "heat";
        const isCooling =
          domain === "climate" && hasHvacAction
            ? (entityState: LineChartState) =>
                CLIMATE_HVAC_ACTION_TO_MODE[
                  entityState.attributes?.hvac_action
                ] === "cool"
            : (entityState: LineChartState) => entityState.state === "cool";

        const hasHeat = states.states.some(isHeating);
        const hasCool = states.states.some(isCooling);
        // We differentiate between thermostats that have a target temperature
        // range versus ones that have just a target temperature

        // Using step chart by step-before so manually interpolation not needed.
        const hasTargetRange = states.states.some(
          (entityState) =>
            entityState.attributes &&
            entityState.attributes.target_temp_high !==
              entityState.attributes.target_temp_low
        );
        addDataSet(
          states.entity_id + "-current_temperature",
          this.showNames
            ? this.hass.localize("ui.card.climate.current_temperature", {
                name: name,
              })
            : this.hass.localize(
                "component.climate.entity_component._.state_attributes.current_temperature.name"
              )
        );
        if (hasHeat) {
          addDataSet(
            states.entity_id + "-heating",
            this.showNames
              ? this.hass.localize("ui.card.climate.heating", { name: name })
              : this.hass.localize(
                  "component.climate.entity_component._.state_attributes.hvac_action.state.heating"
                ),
            computedStyles.getPropertyValue("--state-climate-heat-color"),
            true
          );
          // The "heating" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }
        if (hasCool) {
          addDataSet(
            states.entity_id + "-cooling",
            this.showNames
              ? this.hass.localize("ui.card.climate.cooling", { name: name })
              : this.hass.localize(
                  "component.climate.entity_component._.state_attributes.hvac_action.state.cooling"
                ),
            computedStyles.getPropertyValue("--state-climate-cool-color"),
            true
          );
          // The "cooling" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }

        if (hasTargetRange) {
          addDataSet(
            states.entity_id + "-target_temperature_mode",
            this.showNames
              ? this.hass.localize("ui.card.climate.target_temperature_mode", {
                  name: name,
                  mode: this.hass.localize("ui.card.climate.high"),
                })
              : this.hass.localize(
                  "component.climate.entity_component._.state_attributes.target_temp_high.name"
                )
          );
          addDataSet(
            states.entity_id + "-target_temperature_mode_low",
            this.showNames
              ? this.hass.localize("ui.card.climate.target_temperature_mode", {
                  name: name,
                  mode: this.hass.localize("ui.card.climate.low"),
                })
              : this.hass.localize(
                  "component.climate.entity_component._.state_attributes.target_temp_low.name"
                )
          );
        } else {
          addDataSet(
            states.entity_id + "-target_temperature",
            this.showNames
              ? this.hass.localize(
                  "ui.card.climate.target_temperature_entity",
                  {
                    name: name,
                  }
                )
              : this.hass.localize(
                  "component.climate.entity_component._.state_attributes.temperature.name"
                )
          );
        }

        states.states.forEach((entityState) => {
          if (!entityState.attributes) return;
          const curTemp = safeParseFloat(
            entityState.attributes.current_temperature
          );
          const series = [curTemp];
          if (hasHeat) {
            series.push(isHeating(entityState) ? curTemp : null);
          }
          if (hasCool) {
            series.push(isCooling(entityState) ? curTemp : null);
          }
          if (hasTargetRange) {
            const targetHigh = safeParseFloat(
              entityState.attributes.target_temp_high
            );
            const targetLow = safeParseFloat(
              entityState.attributes.target_temp_low
            );
            series.push(targetHigh, targetLow);
            pushData(new Date(entityState.last_changed), series);
          } else {
            const target = safeParseFloat(entityState.attributes.temperature);
            series.push(target);
            pushData(new Date(entityState.last_changed), series);
          }
        });
      } else if (domain === "humidifier") {
        const hasAction = states.states.some(
          (entityState) => entityState.attributes?.action
        );
        const hasCurrent = states.states.some(
          (entityState) => entityState.attributes?.current_humidity
        );

        const hasHumidifying =
          hasAction &&
          states.states.some(
            (entityState: LineChartState) =>
              entityState.attributes?.action === "humidifying"
          );
        const hasDrying =
          hasAction &&
          states.states.some(
            (entityState: LineChartState) =>
              entityState.attributes?.action === "drying"
          );

        addDataSet(
          states.entity_id + "-target_humidity",
          this.showNames
            ? this.hass.localize("ui.card.humidifier.target_humidity_entity", {
                name: name,
              })
            : this.hass.localize(
                "component.humidifier.entity_component._.state_attributes.humidity.name"
              )
        );

        if (hasCurrent) {
          addDataSet(
            states.entity_id + "-current_humidity",
            this.showNames
              ? this.hass.localize(
                  "ui.card.humidifier.current_humidity_entity",
                  {
                    name: name,
                  }
                )
              : this.hass.localize(
                  "component.humidifier.entity_component._.state_attributes.current_humidity.name"
                )
          );
        }

        // If action attribute is available, we used it to shade the area below the humidity.
        // If action attribute is not available, we shade the area when the device is on
        if (hasHumidifying) {
          addDataSet(
            states.entity_id + "-humidifying",
            this.showNames
              ? this.hass.localize("ui.card.humidifier.humidifying", {
                  name: name,
                })
              : this.hass.localize(
                  "component.humidifier.entity_component._.state_attributes.action.state.humidifying"
                ),
            computedStyles.getPropertyValue("--state-humidifier-on-color"),
            true
          );
        } else if (hasDrying) {
          addDataSet(
            states.entity_id + "-drying",
            this.showNames
              ? this.hass.localize("ui.card.humidifier.drying", {
                  name: name,
                })
              : this.hass.localize(
                  "component.humidifier.entity_component._.state_attributes.action.state.drying"
                ),
            computedStyles.getPropertyValue("--state-humidifier-on-color"),
            true
          );
        } else {
          addDataSet(
            states.entity_id + "-on",
            this.showNames
              ? this.hass.localize("ui.card.humidifier.on_entity", {
                  name: name,
                })
              : this.hass.localize(
                  "component.humidifier.entity_component._.state.on"
                ),
            undefined,
            true
          );
        }

        states.states.forEach((entityState) => {
          if (!entityState.attributes) return;
          const target = safeParseFloat(entityState.attributes.humidity);
          // If the current humidity is not available, then we fill up to the target humidity
          const current = hasCurrent
            ? safeParseFloat(entityState.attributes?.current_humidity)
            : target;
          const series = [target];

          if (hasCurrent) {
            series.push(current);
          }

          if (hasHumidifying) {
            series.push(
              entityState.attributes?.action === "humidifying" ? current : null
            );
          } else if (hasDrying) {
            series.push(
              entityState.attributes?.action === "drying" ? current : null
            );
          } else {
            series.push(entityState.state === "on" ? current : null);
          }
          pushData(new Date(entityState.last_changed), series);
        });
      } else {
        addDataSet(states.entity_id, name);

        let lastValue: number;
        let lastDate: Date;
        let lastNullDate: Date | null = null;

        // Process chart data.
        // When state is `unknown`, calculate the value and break the line.
        const processData = (entityState: LineChartState) => {
          const value = safeParseFloat(entityState.state);
          const date = new Date(entityState.last_changed);
          if (value !== null && lastNullDate) {
            const dateTime = date.getTime();
            const lastNullDateTime = lastNullDate.getTime();
            const lastDateTime = lastDate?.getTime();
            const tmpValue =
              (value - lastValue) *
                ((lastNullDateTime - lastDateTime) /
                  (dateTime - lastDateTime)) +
              lastValue;
            pushData(lastNullDate, [tmpValue]);
            pushData(new Date(lastNullDateTime + 1), [null]);
            pushData(date, [value]);
            lastDate = date;
            lastValue = value;
            lastNullDate = null;
          } else if (value !== null && lastNullDate === null) {
            pushData(date, [value]);
            lastDate = date;
            lastValue = value;
          } else if (
            value === null &&
            lastNullDate === null &&
            lastValue !== undefined
          ) {
            lastNullDate = date;
          }
        };

        if (states.statistics) {
          const stopTime =
            !states.states || states.states.length === 0
              ? 0
              : states.states[0].last_changed;
          for (const statistic of states.statistics) {
            if (stopTime && statistic.last_changed >= stopTime) {
              break;
            }
            processData(statistic);
          }
        }
        states.states.forEach((entityState) => {
          processData(entityState);
        });
        if (lastNullDate !== null) {
          pushData(lastNullDate, [null]);
        }
      }

      // Add an entry for final values
      pushData(endTime, prevValues);

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    this._chartData = datasets;
    this._entityIds = entityIds;
    this._datasetToDataIndex = datasetToDataIndex;
    const visualMap: VisualMapComponentOption[] = [];
    this._chartData.forEach((_, seriesIndex) => {
      const dataIndex = this._datasetToDataIndex[seriesIndex];
      const data = this.data[dataIndex];
      if (!data.statistics || data.statistics.length === 0) {
        return;
      }
      // render stat data with a slightly transparent line
      const firstStateTS =
        data.states[0]?.last_changed ?? this.endTime.getTime();
      visualMap.push({
        show: false,
        seriesIndex,
        dimension: 0,
        pieces: [
          {
            max: firstStateTS - 0.01,
            colorAlpha: 0.5,
          },
          {
            min: firstStateTS,
            colorAlpha: 1,
          },
        ],
      });
    });
    this._visualMap = visualMap.length > 0 ? visualMap : undefined;
  }

  private _formatYAxisLabel = (value: number) => {
    // show the first significant digit for tiny values
    const maximumFractionDigits = Math.max(
      1,
      // use the difference to the previous value to determine the number of significant digits #25526
      -Math.floor(
        Math.log10(Math.abs(value - this._previousYAxisLabelValue || 1))
      )
    );
    const label = formatNumber(value, this.hass.locale, {
      maximumFractionDigits,
    });
    const width = measureTextWidth(label, 12) + 5;
    if (width > this._yWidth) {
      this._yWidth = width;
      fireEvent(this, "y-width-changed", {
        value: this._yWidth,
        chartIndex: this.chartIndex,
      });
    }
    this._previousYAxisLabelValue = value;
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
customElements.define("state-history-chart-line", StateHistoryChartLine);

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-line": StateHistoryChartLine;
  }
}
