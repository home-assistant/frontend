import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/chart/statistics-chart";
import "../../../../src/components/ha-card";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticType,
  StatisticValue,
} from "../../../../src/data/recorder";
import { StatisticMeanType } from "../../../../src/data/recorder";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";

const HOUR = 60 * 60 * 1000;
const HOURS = 48;

const END = new Date();
END.setMinutes(0, 0, 0);
const START = new Date(END.getTime() - HOURS * HOUR);

const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

const hourlyValues = (
  compute: (start: number) => Partial<StatisticValue>
): StatisticValue[] =>
  Array.from({ length: HOURS }, (_, hour) => {
    const start = START.getTime() + hour * HOUR;
    return { start, end: start + HOUR, ...compute(start) };
  });

const energyValues = (dayUse: number, eveningUse: number) => {
  let sum = 0;
  return hourlyValues((start) => {
    const hourOfDay = new Date(start).getHours();
    const base = hourOfDay < 7 ? 0.1 : hourOfDay < 18 ? dayUse : eveningUse;
    const change = round(base + 0.2 * Math.abs(Math.sin(start / HOUR)), 2);
    sum += change;
    return { change, sum: round(sum, 2) };
  });
};

const temperatureValues = (average: number, swing: number) =>
  hourlyValues((start) => {
    const hourOfDay = new Date(start).getHours();
    const mean =
      average +
      swing * Math.sin(((hourOfDay - 9) / 24) * 2 * Math.PI) +
      0.3 * Math.sin(start / HOUR);
    return {
      mean: round(mean, 1),
      min: round(mean - 0.4, 1),
      max: round(mean + 0.4, 1),
    };
  });

const HEAT_PUMP_ID = "sensor.heat_pump_energy";
const LIGHTING_ID = "sensor.lighting_energy";
const LIVING_ROOM_ID = "sensor.living_room_temperature";
const BEDROOM_ID = "sensor.bedroom_temperature";

const HEAT_PUMP = energyValues(0.4, 1.2);
const LIGHTING = energyValues(0.05, 0.3);
const LIVING_ROOM = temperatureValues(21, 1.5);
const BEDROOM = temperatureValues(18.5, 1);

const energyMetadata = (id: string, name: string): StatisticsMetaData => ({
  statistic_id: id,
  statistics_unit_of_measurement: "kWh",
  source: "recorder",
  name,
  has_sum: true,
  mean_type: StatisticMeanType.NONE,
  unit_class: "energy",
});

const temperatureMetadata = (id: string, name: string): StatisticsMetaData => ({
  statistic_id: id,
  statistics_unit_of_measurement: "°C",
  source: "recorder",
  name,
  has_sum: false,
  mean_type: StatisticMeanType.ARITHMETIC,
  unit_class: "temperature",
});

const METADATA: Record<string, StatisticsMetaData> = {
  [HEAT_PUMP_ID]: energyMetadata(HEAT_PUMP_ID, "Heat pump"),
  [LIGHTING_ID]: energyMetadata(LIGHTING_ID, "Lighting"),
  [LIVING_ROOM_ID]: temperatureMetadata(LIVING_ROOM_ID, "Living room"),
  [BEDROOM_ID]: temperatureMetadata(BEDROOM_ID, "Bedroom"),
};

const NAMES = Object.fromEntries(
  Object.values(METADATA).map((meta) => [meta.statistic_id, meta.name!])
);

interface Example {
  title: string;
  description: string;
  statistics: Statistics;
  statTypes: StatisticType[];
  chartType: "line" | "line-stack" | "bar" | "bar-stack";
  unit: string;
  hideLegend?: boolean;
  height?: string;
}

const EXAMPLES: Example[] = [
  {
    title: "Sum as bars",
    description:
      "The change of a sum for each hour, like an energy statistics graph card.",
    statistics: { [HEAT_PUMP_ID]: HEAT_PUMP },
    statTypes: ["change"],
    chartType: "bar",
    unit: "kWh",
  },
  {
    title: "Stacked bars",
    description: "Several sums stacked, to compare what each one adds.",
    statistics: { [HEAT_PUMP_ID]: HEAT_PUMP, [LIGHTING_ID]: LIGHTING },
    statTypes: ["change"],
    chartType: "bar-stack",
    unit: "kWh",
  },
  {
    title: "Mean, min and max",
    description: "A measurement with its hourly mean, min and max.",
    statistics: { [LIVING_ROOM_ID]: LIVING_ROOM },
    statTypes: ["mean", "min", "max"],
    chartType: "line",
    unit: "°C",
  },
  {
    title: "Several statistics",
    description: "The mean of several measurements with the same unit.",
    statistics: { [LIVING_ROOM_ID]: LIVING_ROOM, [BEDROOM_ID]: BEDROOM },
    statTypes: ["mean"],
    chartType: "line",
    unit: "°C",
  },
  {
    title: "Without legend",
    description:
      "A single statistic with a fixed height, like in the more-info dialog.",
    statistics: { [LIVING_ROOM_ID]: LIVING_ROOM },
    statTypes: ["mean", "min", "max"],
    chartType: "line",
    unit: "°C",
    hideLegend: true,
    height: "240px",
  },
];

@customElement("demo-components-statistics-chart")
export class DemoStatisticsChart extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return EXAMPLES.map(
      (example) => html`
        <ha-card header=${example.title}>
          <div class="card-content">
            <p>${example.description}</p>
            <statistics-chart
              .statisticsData=${example.statistics}
              .metadata=${METADATA}
              .names=${NAMES}
              .statTypes=${example.statTypes}
              .chartType=${example.chartType}
              period="hour"
              .unit=${example.unit}
              .startTime=${START}
              .endTime=${END}
              .hideLegend=${example.hideLegend ?? false}
              .height=${example.height}
              .clickForMoreInfo=${false}
            ></statistics-chart>
          </div>
        </ha-card>
      `
    );
  }

  static styles = css`
    ha-card {
      max-width: 800px;
      margin: 24px auto;
    }
    p {
      margin-top: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-statistics-chart": DemoStatisticsChart;
  }
}
