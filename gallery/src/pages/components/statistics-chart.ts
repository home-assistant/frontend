import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
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

interface TimeRange {
  start: number;
  end: number;
}

interface RangeExample {
  id: string;
  title: string;
  description: string;
  statistics: Statistics;
  statTypes: StatisticType[];
  chartType: "line" | "bar";
  unit: string;
  selectRange: boolean;
}

const RANGE_EXAMPLES: RangeExample[] = [
  {
    id: "single",
    title: "Single selection",
    description:
      "A click on the plot sends the clicked time, here used to select one bar. Dragging still zooms. The bars outside the selection fade.",
    statistics: { [HEAT_PUMP_ID]: HEAT_PUMP },
    statTypes: ["change"],
    chartType: "bar",
    unit: "kWh",
    selectRange: false,
  },
  {
    id: "range-bar",
    title: "Range selection",
    description:
      "With select-range, dragging sends a time range instead of zooming, so several bars can be selected at once. A click still selects one bar.",
    statistics: { [HEAT_PUMP_ID]: HEAT_PUMP },
    statTypes: ["change"],
    chartType: "bar",
    unit: "kWh",
    selectRange: true,
  },
  {
    id: "range-line",
    title: "Range selection on lines",
    description:
      "The same on a line chart, where the selection is a band behind the lines.",
    statistics: { [LIVING_ROOM_ID]: LIVING_ROOM },
    statTypes: ["mean", "min", "max"],
    chartType: "line",
    unit: "°C",
    selectRange: true,
  },
];

const snapToHours = (start: number, end: number): TimeRange => ({
  start: Math.floor(start / HOUR) * HOUR,
  end: Math.max(Math.ceil(end / HOUR), Math.floor(start / HOUR) + 1) * HOUR,
});

const formatRange = (range: TimeRange) =>
  `${new Date(range.start).toLocaleString()} to ${new Date(range.end).toLocaleString()}`;

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

  @state() private _selections: Record<string, TimeRange | undefined> = {};

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`${EXAMPLES.map(
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
    )}
    ${RANGE_EXAMPLES.map((example) => this._renderRangeExample(example))}`;
  }

  private _renderRangeExample(example: RangeExample) {
    const selection = this._selections[example.id];
    return html`
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
            .highlight=${selection}
            .clickForMoreInfo=${false}
            data-example=${example.id}
            .selectRange=${example.selectRange}
            hide-legend
            @chart-grid-click=${this._gridClicked}
            @chart-range-select=${this._rangeSelected}
          ></statistics-chart>
          <p class="selection">
            ${selection ? formatRange(selection) : "Nothing selected"}
          </p>
        </div>
      </ha-card>
    `;
  }

  private _gridClicked(ev: HASSDomEvent<HASSDomEvents["chart-grid-click"]>) {
    this._select(ev, snapToHours(ev.detail.x, ev.detail.x));
  }

  private _rangeSelected(
    ev: HASSDomEvent<HASSDomEvents["chart-range-select"]>
  ) {
    this._select(ev, snapToHours(ev.detail.start, ev.detail.end));
  }

  private _select(ev: Event, range: TimeRange) {
    const id = (ev.currentTarget as HTMLElement).dataset.example!;
    this._selections = { ...this._selections, [id]: range };
  }

  static styles = css`
    ha-card {
      max-width: 800px;
      margin: 24px auto;
    }
    p {
      margin-top: 0;
    }
    .selection {
      margin: 8px 0 0;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-statistics-chart": DemoStatisticsChart;
  }
}
