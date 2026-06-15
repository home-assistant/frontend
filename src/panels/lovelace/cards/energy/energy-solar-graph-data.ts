import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { computeYAxisFractionDigits } from "../../../../components/chart/y-axis-fraction-digits";
import type {
  EnergyData,
  EnergySolarForecasts,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { getSuggestedPeriod } from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { HomeAssistant } from "../../../../types";
import { getEnergyColor } from "./common/color";
import {
  computeStatMidpoint,
  type EnergyDataPoint,
  fillDataGapsAndRoundCaps,
  getCompareTransform,
} from "./common/energy-chart-options";

export interface EnergySolarGraphDataParams {
  hass: HomeAssistant;
  energyData: EnergyData;
  /**
   * Solar forecasts resolved by the caller (the async fetch stays in the
   * component); `undefined` when no forecast data is available.
   */
  forecasts: EnergySolarForecasts | undefined;
  computedStyles: CSSStyleDeclaration;
  /** Fallback for `energyData.end` (the component uses `endOfToday()`). */
  now: Date;
}

export interface EnergySolarGraphData {
  chartData: (BarSeriesOption | LineSeriesOption)[];
  total: number;
  start: Date;
  end: Date;
  compareStart?: Date;
  compareEnd?: Date;
  yAxisFractionDigits: number;
}

/**
 * Transforms an `EnergyData` collection update into the ECharts series and
 * derived state for `hui-energy-solar-graph-card`. Pure data processing: all
 * environment inputs (current time, theme style, hass, resolved forecasts) are
 * injected so the transform is deterministic and benchmarkable.
 */
export function generateEnergySolarGraphData(
  params: EnergySolarGraphDataParams
): EnergySolarGraphData {
  const { hass, energyData, forecasts, computedStyles, now } = params;

  const start = energyData.start;
  const end = energyData.end || now;

  const compareStart = energyData.startCompare;
  const compareEnd = energyData.endCompare;

  const solarSources: SolarSourceTypeEnergyPreference[] =
    energyData.prefs.energy_sources.filter(
      (source) => source.type === "solar"
    ) as SolarSourceTypeEnergyPreference[];

  const datasets: (BarSeriesOption | LineSeriesOption)[] = [];

  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number) => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  };

  if (energyData.statsCompare) {
    datasets.push(
      ...processDataSet(
        hass,
        start,
        end,
        compareStart,
        energyData.statsCompare,
        energyData.statsMetadata,
        solarSources,
        computedStyles,
        trackY,
        true
      )
    );
  } else {
    // add empty dataset so compare bars are first
    // `stack: solar` so it doesn't take up space yet
    const firstId = solarSources[0]?.stat_energy_from ?? "placeholder";
    datasets.push({
      id: "compare-" + firstId,
      type: "bar",
      stack: "solar",
      data: [],
    });
  }

  datasets.push(
    ...processDataSet(
      hass,
      start,
      end,
      compareStart,
      energyData.stats,
      energyData.statsMetadata,
      solarSources,
      computedStyles,
      trackY
    )
  );

  fillDataGapsAndRoundCaps(datasets as BarSeriesOption[]);

  if (forecasts) {
    datasets.push(
      ...processForecast(
        hass,
        energyData.statsMetadata,
        forecasts,
        solarSources,
        computedStyles.getPropertyValue("--primary-text-color"),
        energyData.start,
        energyData.end,
        trackY
      )
    );
  }

  return {
    chartData: datasets,
    total: processTotal(energyData.stats, solarSources),
    start,
    end,
    compareStart,
    compareEnd,
    yAxisFractionDigits: computeYAxisFractionDigits(yMin, yMax),
  };
}

function processTotal(
  statistics: Statistics,
  solarSources: SolarSourceTypeEnergyPreference[]
) {
  return solarSources.reduce(
    (sum, source) =>
      sum +
      (source.stat_energy_from in statistics
        ? statistics[source.stat_energy_from].reduce(
            (acc, curr) => acc + (curr.change || 0),
            0
          )
        : 0),
    0
  );
}

function processDataSet(
  hass: HomeAssistant,
  start: Date,
  end: Date,
  compareStart: Date | undefined,
  statistics: Statistics,
  statisticsMetaData: Record<string, StatisticsMetaData>,
  solarSources: SolarSourceTypeEnergyPreference[],
  computedStyles: CSSStyleDeclaration,
  trackY: (v: number) => void,
  compare = false
) {
  const data: BarSeriesOption[] = [];
  const compareTransform = getCompareTransform(start, compareStart!);
  const period = getSuggestedPeriod(start, end);

  solarSources.forEach((source, idx) => {
    let prevStart: number | null = null;

    const solarProductionData: BarSeriesOption["data"] = [];

    // Process solar production data.
    if (source.stat_energy_from in statistics) {
      const stats = statistics[source.stat_energy_from];

      for (const point of stats) {
        if (
          point.change === null ||
          point.change === undefined ||
          point.change === 0
        ) {
          continue;
        }
        if (prevStart === point.start) {
          continue;
        }
        const dataPoint: EnergyDataPoint = [
          computeStatMidpoint(
            point.start,
            point.end,
            period,
            compare ? compareTransform : undefined
          ),
          point.change,
          point.start,
        ];
        solarProductionData.push(dataPoint);
        trackY(point.change);
        prevStart = point.start;
      }
    }

    data.push({
      type: "bar",
      cursor: "default",
      id: compare
        ? "compare-" + source.stat_energy_from
        : source.stat_energy_from,
      name: hass.localize(
        "ui.panel.lovelace.cards.energy.energy_solar_graph.production",
        {
          name:
            source.name ||
            getStatisticLabel(
              hass,
              source.stat_energy_from,
              statisticsMetaData[source.stat_energy_from]
            ),
        }
      ),
      barMaxWidth: 50,
      itemStyle: {
        borderColor: getEnergyColor(
          computedStyles,
          hass.themes.darkMode,
          false,
          compare,
          "--energy-solar-color",
          idx
        ),
      },
      color: getEnergyColor(
        computedStyles,
        hass.themes.darkMode,
        true,
        compare,
        "--energy-solar-color",
        idx
      ),
      data: solarProductionData,
      stack: compare ? "compare" : "solar",
    });
  });

  return data;
}

function processForecast(
  hass: HomeAssistant,
  statisticsMetaData: Record<string, StatisticsMetaData>,
  forecasts: EnergySolarForecasts,
  solarSources: SolarSourceTypeEnergyPreference[],
  borderColor: string,
  start: Date,
  end: Date | undefined,
  trackY: (v: number) => void
) {
  const data: LineSeriesOption[] = [];

  const period = getSuggestedPeriod(start, end);

  // Process solar forecast data.
  solarSources.forEach((source) => {
    if (source.config_entry_solar_forecast) {
      const forecastsData: Record<string, number> | undefined = {};
      source.config_entry_solar_forecast.forEach((configEntryId) => {
        if (!forecasts![configEntryId]) {
          return;
        }
        Object.entries(forecasts![configEntryId].wh_hours).forEach(
          ([date, value]) => {
            const dateObj = new Date(date);
            if (dateObj < start || (end && dateObj > end)) {
              return;
            }
            if (period === "month") {
              dateObj.setDate(1);
            }
            if (period === "month" || period === "day") {
              dateObj.setHours(0, 0, 0, 0);
            } else {
              dateObj.setMinutes(0, 0, 0);
            }
            const time = dateObj.getTime();
            if (time in forecastsData) {
              forecastsData[time] += value;
            } else {
              forecastsData[time] = value;
            }
          }
        );
      });

      if (forecastsData) {
        const solarForecastData: LineSeriesOption["data"] = [];
        // Only center forecast points for sub-daily periods to align with bars.
        // Only start timestamps available, so estimate midpoint from the gap
        // between the first two entries. Assumes uniform spacing.
        let forecastOffset = 0;
        if (period === "hour" || period === "5minute") {
          const forecastTimes = Object.keys(forecastsData)
            .map(Number)
            .sort((a, b) => a - b);
          forecastOffset =
            forecastTimes.length >= 2
              ? (forecastTimes[1] - forecastTimes[0]) / 2
              : 0;
        }
        for (const [time, value] of Object.entries(forecastsData)) {
          const kWh = value / 1000;
          solarForecastData.push([Number(time) + forecastOffset, kWh]);
          trackY(kWh);
        }

        if (solarForecastData.length) {
          data.push({
            id: "forecast-" + source.stat_energy_from,
            type: "line",
            stack: "forecast",
            name: hass.localize(
              "ui.panel.lovelace.cards.energy.energy_solar_graph.forecast",
              {
                name:
                  source.name ||
                  getStatisticLabel(
                    hass,
                    source.stat_energy_from,
                    statisticsMetaData[source.stat_energy_from]
                  ),
              }
            ),
            step: false,
            color: borderColor,
            lineStyle: {
              type: [7, 5],
              width: 1.5,
            },
            symbol: "none",
            data: solarForecastData,
          });
        }
      }
    }
  });

  return data;
}
