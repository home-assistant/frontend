/**
 * Characterization tests pinning the exact output of the history line chart
 * data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import { generateStateHistoryChartLineData } from "../../../src/components/chart/state-history-chart-line-data";
import {
  computeHistory,
  convertStatisticsToHistory,
} from "../../../src/data/history";
import { createMockComputedStyle } from "../../fixtures/computed-style";
import { digestResult } from "../../fixtures/digest";
import {
  createMockEntityState,
  createMockHass,
  mockLocalize,
} from "../../fixtures/hass";
import {
  FIXED_EPOCH_MS,
  generateClimateStates,
  generateMixedHistory,
  generateNumericSensorStates,
} from "../../fixtures/history-states";
import { generateStatistics } from "../../fixtures/statistics";

const SENSOR_NUMERIC_DEVICE_CLASSES = ["power", "energy", "temperature"];
const computedStyles = createMockComputedStyle();
const hass = createMockHass();
const dayMs = 24 * 60 * 60 * 1000;

/** Run history fixtures through computeHistory to get LineChartEntity[] */
const toLineChartEntities = (history) =>
  computeHistory(
    hass,
    history,
    [],
    mockLocalize,
    SENSOR_NUMERIC_DEVICE_CLASSES
  ).line.flatMap((unit) => unit.data);

describe("generateStateHistoryChartLineData", () => {
  const baseParams = {
    hass,
    computedStyles,
    showNames: true,
    endTime: new Date(FIXED_EPOCH_MS + dayMs),
    now: new Date(FIXED_EPOCH_MS + dayMs + 60 * 60 * 1000),
  } as const;

  it("returns undefined for empty data", () => {
    expect(
      generateStateHistoryChartLineData({ ...baseParams, data: [] })
    ).toBeUndefined();
  });

  it("matches snapshot for numeric sensors", () => {
    const data = toLineChartEntities({
      "sensor.power_meter": generateNumericSensorStates(1, { count: 40 }),
      "sensor.power_solar": generateNumericSensorStates(2, { count: 40 }),
    });
    expect(
      generateStateHistoryChartLineData({ ...baseParams, data })
    ).toMatchSnapshot();
  });

  it("matches snapshot for a climate entity with hvac action modes", () => {
    const data = toLineChartEntities({
      "climate.thermostat": generateClimateStates(3, { count: 40 }),
    });
    expect(
      generateStateHistoryChartLineData({ ...baseParams, data })
    ).toMatchSnapshot();
  });

  it("appends current state for sensors when endTime is now", () => {
    const data = toLineChartEntities({
      "sensor.power_meter": generateNumericSensorStates(4, { count: 20 }),
    });
    const endTime = new Date(FIXED_EPOCH_MS + dayMs);
    expect(
      generateStateHistoryChartLineData({
        ...baseParams,
        hass: createMockHass({
          "sensor.power_meter": createMockEntityState(
            "sensor.power_meter",
            "123.4",
            { unit_of_measurement: "W" }
          ),
        }),
        data,
        endTime,
        now: new Date(endTime.getTime() + 500),
      })
    ).toMatchSnapshot();
  });

  it("builds a visual map for entities backed by statistics", () => {
    const statsHistory = convertStatisticsToHistory(
      hass,
      generateStatistics(5, {
        ids: ["sensor.power_meter"],
        period: "hour",
        days: 1,
      }),
      ["sensor.power_meter"],
      SENSOR_NUMERIC_DEVICE_CLASSES
    );
    const recent = toLineChartEntities({
      "sensor.power_meter": generateNumericSensorStates(6, {
        count: 20,
        startMs: FIXED_EPOCH_MS + dayMs - 60 * 60 * 1000,
      }),
    });
    const data = [
      {
        ...recent[0],
        statistics: statsHistory.line[0].data[0].statistics,
      },
    ];
    const result = generateStateHistoryChartLineData({ ...baseParams, data });
    expect(result?.visualMap).toBeDefined();
    expect(result).toMatchSnapshot();
  });

  it("large mixed payload digest is stable", () => {
    const data = toLineChartEntities(generateMixedHistory(42, "large"));
    expect(
      digestResult(
        generateStateHistoryChartLineData({
          ...baseParams,
          endTime: new Date(FIXED_EPOCH_MS + 30 * dayMs),
          data,
        })
      )
    ).toMatchSnapshot();
  });
});
