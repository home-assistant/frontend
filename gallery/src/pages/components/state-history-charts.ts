import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/chart/state-history-charts";
import "../../../../src/components/ha-card";
import type {
  HistoryResult,
  LineChartState,
  TimelineState,
} from "../../../../src/data/history";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import { followGalleryTheme } from "../../data/follow-gallery-theme";

const HOUR = 60 * 60 * 1000;
const HOURS = 48;

const END = new Date();
END.setMinutes(0, 0, 0);
const START = new Date(END.getTime() - HOURS * HOUR);

const ENTITIES = [
  {
    entity_id: "sensor.outdoor_temperature",
    state: "12.4",
    attributes: {
      friendly_name: "Outdoor temperature",
      device_class: "temperature",
      state_class: "measurement",
      unit_of_measurement: "°C",
    },
  },
  {
    entity_id: "light.living_room",
    state: "on",
    attributes: { friendly_name: "Living room light" },
  },
  {
    entity_id: "binary_sensor.front_door",
    state: "off",
    attributes: { friendly_name: "Front door", device_class: "door" },
  },
];

const temperatureStates = (): LineChartState[] =>
  Array.from({ length: HOURS * 2 }, (_, index) => {
    const time = START.getTime() + (index * HOUR) / 2;
    const hourOfDay = new Date(time).getHours();
    const value =
      10 +
      4 * Math.sin(((hourOfDay - 9) / 24) * 2 * Math.PI) +
      0.5 * Math.sin(time / HOUR);
    return {
      state: value.toFixed(1),
      last_changed: time,
    };
  });

const toggleStates = (
  onHours: [number, number][],
  onLabel: string,
  offLabel: string
): TimelineState[] => {
  const on = { state: "on", state_localize: onLabel };
  const off = { state: "off", state_localize: offLabel };
  const states: TimelineState[] = [{ ...off, last_changed: START.getTime() }];
  onHours.forEach(([from, to]) => {
    states.push(
      { ...on, last_changed: START.getTime() + from * HOUR },
      { ...off, last_changed: START.getTime() + to * HOUR }
    );
  });
  return states;
};

const HISTORY: HistoryResult = {
  line: [
    {
      unit: "°C",
      device_class: "temperature",
      identifier: "temperature",
      data: [
        {
          domain: "sensor",
          name: "Outdoor temperature",
          entity_id: "sensor.outdoor_temperature",
          states: temperatureStates(),
        },
      ],
    },
  ],
  timeline: [
    {
      name: "Living room light",
      entity_id: "light.living_room",
      data: toggleStates(
        [
          [6, 8],
          [18, 23],
          [30, 32],
          [42, 47],
        ],
        "On",
        "Off"
      ),
    },
    {
      name: "Front door",
      entity_id: "binary_sensor.front_door",
      data: toggleStates(
        [
          [7.5, 7.6],
          [17, 17.2],
          [31.5, 31.6],
          [41, 41.1],
        ],
        "Open",
        "Closed"
      ),
    },
  ],
};

const LIGHT_ONLY: HistoryResult = {
  line: [],
  timeline: [HISTORY.timeline[0]],
};

interface Example {
  title: string;
  description: string;
  history: HistoryResult;
  showNames?: boolean;
  insideLabels?: boolean;
  syncCharts?: boolean;
}

const EXAMPLES: Example[] = [
  {
    title: "Names in a column",
    description:
      "The default layout, like the history graph card: timeline names on the left and a line chart for each unit.",
    history: HISTORY,
  },
  {
    title: "Names inside the timeline, synced zoom",
    description:
      "Like the history panel: names sit under each timeline bar, and zooming one chart zooms all of them.",
    history: HISTORY,
    insideLabels: true,
    syncCharts: true,
  },
  {
    title: "Single entity without names",
    description:
      "Like the more-info dialog, where the entity is already known.",
    history: LIGHT_ONLY,
    showNames: false,
  },
];

@customElement("demo-components-state-history-charts")
export class DemoStateHistoryCharts extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    followGalleryTheme(this, hass);
    hass.addEntities(ENTITIES);
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
            <state-history-charts
              .historyData=${example.history}
              .startTime=${START}
              .endTime=${END}
              .showNames=${example.showNames ?? true}
              .insideLabels=${example.insideLabels ?? false}
              .syncCharts=${example.syncCharts ?? false}
              .clickForMoreInfo=${false}
            ></state-history-charts>
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
    "demo-components-state-history-charts": DemoStateHistoryCharts;
  }
}
