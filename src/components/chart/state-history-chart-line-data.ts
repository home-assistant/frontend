import type { LineSeriesOption } from "echarts/charts";
import type { VisualMapComponentOption } from "echarts/components";
import { getGraphColorByIndex } from "../../common/color/colors";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../data/climate";
import type { LineChartEntity, LineChartState } from "../../data/history";
import type { HomeAssistant } from "../../types";
import { computeYAxisFractionDigits } from "./y-axis-fraction-digits";

const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : null;
};

export const CLIMATE_MODE_CONFIGS = [
  { mode: "heat", action: "heating", cssVar: "--state-climate-heat-color" },
  { mode: "cool", action: "cooling", cssVar: "--state-climate-cool-color" },
  { mode: "dry", action: "drying", cssVar: "--state-climate-dry-color" },
  { mode: "fan_only", action: "fan", cssVar: "--state-climate-fan_only-color" },
] as const;

export interface StateHistoryChartLineDataParams {
  hass: HomeAssistant;
  data: LineChartEntity[];
  endTime: Date;
  names?: Record<string, string>;
  colors?: Record<string, string | undefined>;
  showNames: boolean;
  computedStyles: CSSStyleDeclaration;
  now: Date;
}

export interface StateHistoryChartLineData {
  datasets: LineSeriesOption[];
  entityIds: string[];
  datasetToDataIndex: number[];
  visualMap?: VisualMapComponentOption[];
  yAxisFractionDigits: number;
}

/**
 * Transforms processed history (`LineChartEntity[]`) into ECharts series for
 * `state-history-chart-line`. Pure data processing: all environment inputs
 * (current time, theme style, hass) are injected so the transform is
 * deterministic and benchmarkable.
 */
export function generateStateHistoryChartLineData(
  params: StateHistoryChartLineDataParams
): StateHistoryChartLineData | undefined {
  const { hass, computedStyles, endTime } = params;
  // Work with numeric epoch timestamps (ms) instead of Date objects below.
  // Charts can hold a huge number of points, and allocating a Date per point
  // is needless GC pressure; the "time" axis consumes numbers natively.
  const endTimeMs = endTime.getTime();

  let colorIndex = 0;
  const entityStates = params.data;
  const datasets: LineSeriesOption[] = [];
  const entityIds: string[] = [];
  const datasetToDataIndex: number[] = [];
  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number | null | undefined) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  };
  if (entityStates.length === 0) {
    return undefined;
  }

  const names = params.names || {};
  const colors = params.colors || {};
  entityStates.forEach((states, dataIdx) => {
    const domain = states.domain;
    const name = names[states.entity_id] || states.name;
    const color = colors[states.entity_id];
    // array containing [value1, value2, etc]
    let prevValues: any[] | null = null;

    const data: LineSeriesOption[] = [];

    const pushData = (timestamp: number, datavalues: any[] | null) => {
      if (!datavalues) return;
      if (timestamp > endTimeMs) {
        // Drop data points that are after the requested endTime. This could happen if
        // endTime is "now" and client time is not in sync with server time.
        return;
      }
      const prev = prevValues;
      for (let i = 0, len = data.length; i < len; i++) {
        const seriesData = data[i].data!;
        const value = datavalues[i];
        if (value === null && prev && prev[i] !== null) {
          // null data values show up as gaps in the chart.
          // If the current value for the dataset is null and the previous
          // value of the data set is not null, then add an 'end' point
          // to the chart for the previous value. Otherwise the gap will
          // be too big. It will go from the start of the previous data
          // value until the start of the next data value.
          seriesData.push([timestamp, prev[i]]);
        }
        seriesData.push([timestamp, value]);
        // inlined trackY (still used as a function for the sensor append below)
        if (typeof value === "number" && Number.isFinite(value)) {
          if (value < yMin) yMin = value;
          if (value > yMax) yMax = value;
        }
      }
      prevValues = datavalues;
    };

    const addDataSet = (
      id: string,
      nameY: string,
      clr?: string,
      fill = false
    ) => {
      if (!clr) {
        clr = getGraphColorByIndex(colorIndex, computedStyles);
        colorIndex++;
      }
      data.push({
        id,
        data: [],
        type: "line",
        cursor: "default",
        name: nameY,
        color: clr,
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
              color: clr + "7F",
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

      const activeModes = CLIMATE_MODE_CONFIGS.map(
        ({ mode, action, cssVar }) => {
          const isActive =
            domain === "climate" && hasHvacAction
              ? (entityState: LineChartState) =>
                  CLIMATE_HVAC_ACTION_TO_MODE[
                    entityState.attributes?.hvac_action
                  ] === mode
              : (entityState: LineChartState) => entityState.state === mode;
          return { action, cssVar, isActive };
        }
      ).filter(({ isActive }) => states.states.some(isActive));
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
        params.showNames
          ? hass.localize("ui.card.climate.current_temperature", {
              name: name,
            })
          : hass.localize(
              "component.climate.entity_component._.state_attributes.current_temperature.name"
            )
      );
      for (const { action, cssVar } of activeModes) {
        addDataSet(
          `${states.entity_id}-${action}`,
          params.showNames
            ? hass.localize(`ui.card.climate.${action}`, {
                name: name,
              })
            : hass.localize(
                `component.climate.entity_component._.state_attributes.hvac_action.state.${action}`
              ),
          computedStyles.getPropertyValue(cssVar),
          true
        );
      }

      if (hasTargetRange) {
        addDataSet(
          states.entity_id + "-target_temperature_mode",
          params.showNames
            ? hass.localize("ui.card.climate.target_temperature_mode", {
                name: name,
                mode: hass.localize("ui.card.climate.high"),
              })
            : hass.localize(
                "component.climate.entity_component._.state_attributes.target_temp_high.name"
              )
        );
        addDataSet(
          states.entity_id + "-target_temperature_mode_low",
          params.showNames
            ? hass.localize("ui.card.climate.target_temperature_mode", {
                name: name,
                mode: hass.localize("ui.card.climate.low"),
              })
            : hass.localize(
                "component.climate.entity_component._.state_attributes.target_temp_low.name"
              )
        );
      } else {
        addDataSet(
          states.entity_id + "-target_temperature",
          params.showNames
            ? hass.localize("ui.card.climate.target_temperature_entity", {
                name: name,
              })
            : hass.localize(
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
        for (const { isActive } of activeModes) {
          series.push(isActive(entityState) ? curTemp : null);
        }
        if (hasTargetRange) {
          const targetHigh = safeParseFloat(
            entityState.attributes.target_temp_high
          );
          const targetLow = safeParseFloat(
            entityState.attributes.target_temp_low
          );
          series.push(targetHigh, targetLow);
          pushData(entityState.last_changed, series);
        } else {
          const target = safeParseFloat(entityState.attributes.temperature);
          series.push(target);
          pushData(entityState.last_changed, series);
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
        params.showNames
          ? hass.localize("ui.card.humidifier.target_humidity_entity", {
              name: name,
            })
          : hass.localize(
              "component.humidifier.entity_component._.state_attributes.humidity.name"
            )
      );

      if (hasCurrent) {
        addDataSet(
          states.entity_id + "-current_humidity",
          params.showNames
            ? hass.localize("ui.card.humidifier.current_humidity_entity", {
                name: name,
              })
            : hass.localize(
                "component.humidifier.entity_component._.state_attributes.current_humidity.name"
              )
        );
      }

      // If action attribute is available, we used it to shade the area below the humidity.
      // If action attribute is not available, we shade the area when the device is on
      if (hasHumidifying) {
        addDataSet(
          states.entity_id + "-humidifying",
          params.showNames
            ? hass.localize("ui.card.humidifier.humidifying", {
                name: name,
              })
            : hass.localize(
                "component.humidifier.entity_component._.state_attributes.action.state.humidifying"
              ),
          computedStyles.getPropertyValue("--state-humidifier-on-color"),
          true
        );
      } else if (hasDrying) {
        addDataSet(
          states.entity_id + "-drying",
          params.showNames
            ? hass.localize("ui.card.humidifier.drying", {
                name: name,
              })
            : hass.localize(
                "component.humidifier.entity_component._.state_attributes.action.state.drying"
              ),
          computedStyles.getPropertyValue("--state-humidifier-on-color"),
          true
        );
      } else {
        addDataSet(
          states.entity_id + "-on",
          params.showNames
            ? hass.localize("ui.card.humidifier.on_entity", {
                name: name,
              })
            : hass.localize("component.humidifier.entity_component._.state.on"),
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
        pushData(entityState.last_changed, series);
      });
    } else {
      addDataSet(states.entity_id, name, color);

      let lastValue: number;
      let lastDate: number;
      let lastNullDate: number | null = null;

      // Process chart data.
      // When state is `unknown`, calculate the value and break the line.
      const processData = (entityState: LineChartState) => {
        const value = safeParseFloat(entityState.state);
        const date = entityState.last_changed;
        if (value !== null && lastNullDate) {
          const tmpValue =
            (value - lastValue) *
              ((lastNullDate - lastDate) / (date - lastDate)) +
            lastValue;
          pushData(lastNullDate, [tmpValue]);
          pushData(lastNullDate + 1, [null]);
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
    pushData(endTimeMs, prevValues);

    // For sensors, append current state if viewing recent data
    const nowMs = params.now.getTime();
    // allow 1s of leeway for "now"
    const isUpToNow = nowMs - endTimeMs <= 1000;
    if (domain === "sensor" && isUpToNow && data.length === 1) {
      const stateObj = hass.states[states.entity_id];
      const currentValue = stateObj ? safeParseFloat(stateObj.state) : null;
      if (currentValue !== null) {
        data[0].data!.push([nowMs, currentValue]);
        trackY(currentValue);
      }
    }

    // Concat two arrays
    Array.prototype.push.apply(datasets, data);
  });

  const visualMap: VisualMapComponentOption[] = [];
  datasets.forEach((_, seriesIndex) => {
    const dataIndex = datasetToDataIndex[seriesIndex];
    const data = entityStates[dataIndex];
    if (!data.statistics || data.statistics.length === 0) {
      return;
    }
    // render stat data with a slightly transparent line
    const firstStateTS = data.states[0]?.last_changed ?? endTime.getTime();
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

  return {
    datasets,
    entityIds,
    datasetToDataIndex,
    visualMap: visualMap.length > 0 ? visualMap : undefined,
    yAxisFractionDigits: computeYAxisFractionDigits(yMin, yMax),
  };
}
