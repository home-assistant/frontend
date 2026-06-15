import type { BarSeriesOption } from "echarts/charts";
import { computeYAxisFractionDigits } from "../../../../components/chart/y-axis-fraction-digits";
import { fillDataGapsAndRoundCaps } from "../../../../components/chart/round-caps";
import type {
  EnergyData,
  GasSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { getSuggestedPeriod } from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import type { HomeAssistant } from "../../../../types";
import { getEnergyColor } from "./common/color";
import {
  computeStatMidpoint,
  type EnergyDataPoint,
  getCompareTransform,
} from "./common/energy-chart-options";

export interface EnergyGasGraphDataParams {
  hass: HomeAssistant;
  energyData: EnergyData;
  computedStyles: CSSStyleDeclaration;
  /** Current time, injected so the transform is deterministic. */
  now: Date;
}

export interface EnergyGasGraphData {
  chartData: BarSeriesOption[];
  start: Date;
  end: Date;
  compareStart?: Date;
  compareEnd?: Date;
  unit?: string;
  total?: number;
  yAxisFractionDigits: number;
}

/**
 * Transforms an energy collection update (`EnergyData` + config + environment)
 * into the gas graph card's chart series and derived state. Pure data
 * processing: every environment read (current time, theme style, hass) is
 * injected so the transform is deterministic and benchmarkable.
 */
export function generateEnergyGasGraphData(
  params: EnergyGasGraphDataParams
): EnergyGasGraphData {
  const { hass, energyData, computedStyles, now } = params;

  const start = energyData.start;
  const end = energyData.end || now;

  const compareStart = energyData.startCompare;
  const compareEnd = energyData.endCompare;

  const gasSources: GasSourceTypeEnergyPreference[] =
    energyData.prefs.energy_sources.filter(
      (source) => source.type === "gas"
    ) as GasSourceTypeEnergyPreference[];

  const unit = energyData.gasUnit;

  const datasets: BarSeriesOption[] = [];

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
        gasSources,
        computedStyles,
        trackY,
        true
      )
    );
  } else {
    // add empty dataset so compare bars are first
    // `stack: gas` so it doesn't take up space yet
    const firstId = gasSources[0]?.stat_energy_from ?? "placeholder";
    datasets.push({
      id: "compare-" + firstId,
      type: "bar",
      stack: "gas",
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
      gasSources,
      computedStyles,
      trackY
    )
  );

  fillDataGapsAndRoundCaps(datasets);
  const yAxisFractionDigits = computeYAxisFractionDigits(yMin, yMax);
  const chartData = datasets;
  const total = processTotal(energyData.stats, gasSources);

  return {
    chartData,
    start,
    end,
    compareStart,
    compareEnd,
    unit,
    total,
    yAxisFractionDigits,
  };
}

function processTotal(
  statistics: Statistics,
  gasSources: GasSourceTypeEnergyPreference[]
) {
  return gasSources.reduce(
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
  gasSources: GasSourceTypeEnergyPreference[],
  computedStyles: CSSStyleDeclaration,
  trackY: (v: number) => void,
  compare = false
) {
  const data: BarSeriesOption[] = [];
  const compareTransform = getCompareTransform(start, compareStart!);
  const period = getSuggestedPeriod(start, end);

  gasSources.forEach((source, idx) => {
    let prevStart: number | null = null;

    const gasConsumptionData: BarSeriesOption["data"] = [];

    // Process gas consumption data.
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
        gasConsumptionData.push(dataPoint);
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
      name:
        source.name ||
        getStatisticLabel(
          hass,
          source.stat_energy_from,
          statisticsMetaData[source.stat_energy_from]
        ),
      barMaxWidth: 50,
      itemStyle: {
        borderColor: getEnergyColor(
          computedStyles,
          hass.themes.darkMode,
          false,
          compare,
          "--energy-gas-color",
          idx
        ),
      },
      color: getEnergyColor(
        computedStyles,
        hass.themes.darkMode,
        true,
        compare,
        "--energy-gas-color",
        idx
      ),
      data: gasConsumptionData,
      stack: compare ? "compare-gas" : "gas",
    });
  });
  return data;
}
