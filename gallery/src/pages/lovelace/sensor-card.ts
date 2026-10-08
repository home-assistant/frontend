import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { mockHistory } from "../../../../demo/src/stubs/history";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { SensorCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { DemoCardConfig } from "../../components/demo-card";
import "../../components/demo-cards";

const ENTITIES = [
  {
    entity_id: "sensor.outside_temperature",
    state: "15.6",
    attributes: {
      friendly_name: "Outside temperature",
      device_class: "temperature",
      unit_of_measurement: "°C",
    },
  },
  {
    entity_id: "sensor.outside_humidity",
    state: "54",
    attributes: {
      friendly_name: "Outside humidity",
      device_class: "humidity",
      unit_of_measurement: "%",
    },
  },
  {
    entity_id: "sensor.phone_battery",
    state: "18",
    attributes: {
      friendly_name: "Phone battery",
      device_class: "battery",
      unit_of_measurement: "%",
    },
  },
  {
    entity_id: "sensor.not_working",
    state: "unavailable",
    attributes: {
      friendly_name: "Not working",
    },
  },
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: {
      type: "sensor",
      entity: "sensor.outside_temperature",
    },
  },
  {
    heading: "With line graph",
    config: {
      type: "sensor",
      entity: "sensor.outside_temperature",
      graph: "line",
    },
  },
  {
    heading: "With graph detail and hours to show",
    config: {
      type: "sensor",
      entity: "sensor.outside_humidity",
      graph: "line",
      detail: 2,
      hours_to_show: 6,
    },
  },
  {
    heading: "With state color",
    config: {
      type: "sensor",
      entity: "sensor.phone_battery",
      icon: "mdi:battery-20",
      graph: "line",
      state_color: true,
    },
  },
  {
    heading: "With name, icon and unit",
    config: {
      type: "sensor",
      entity: "sensor.outside_humidity",
      name: "Humidity",
      icon: "mdi:water",
      unit: "pct",
    },
  },
  {
    heading: "Without tap action (not focusable)",
    config: {
      type: "sensor",
      entity: "sensor.outside_temperature",
      tap_action: { action: "none" },
    },
  },
  {
    heading: "Unavailable",
    config: {
      type: "sensor",
      entity: "sensor.not_working",
    },
  },
  {
    heading: "Invalid entity",
    config: {
      type: "sensor",
      entity: "sensor.invalid_entity",
    },
  },
] satisfies DemoCardConfig<SensorCardConfig>[];

@customElement("demo-lovelace-sensor-card")
class DemoSensorCard extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.updateHass({
      config: {
        ...hass.config,
        components: [...hass.config.components, "history"],
      },
    });
    hass.addEntities(ENTITIES);
    mockIcons(hass);
    mockHistory(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-sensor-card": DemoSensorCard;
  }
}
