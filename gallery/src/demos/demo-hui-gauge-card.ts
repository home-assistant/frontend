import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/demo-cards";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";

const ENTITIES = [
  getEntity("sensor", "brightness", "12", {}),
  getEntity("plant", "bonsai", "ok", {}),
  getEntity("sensor", "outside_humidity", "54", {
    unit_of_measurement: "%",
  }),
  getEntity("sensor", "outside_temperature", "15.6", {
    unit_of_measurement: "°C",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: gauge
  entity: sensor.brightness
    `,
  },
  {
    heading: "With title",
    config: `
- type: gauge
  title: Humidity
  entity: sensor.outside_humidity
    `,
  },
  {
    heading: "Custom Unit of Measurement",
    config: `
- type: gauge
  entity: sensor.outside_temperature
  unit_of_measurement: C
    `,
  },
  {
    heading: "Setting Severity Levels",
    config: `
- type: gauge
  entity: sensor.brightness
  severity:
    red: 32
    green: 0
    yellow: 23
    `,
  },
  {
    heading: "Setting Min and Max Values",
    config: `
- type: gauge
  entity: sensor.brightness
  min: 0
  max: 38
    `,
  },
  {
    heading: "Invalid Entity",
    config: `
- type: gauge
  entity: sensor.invalid_entity
    `,
  },
  {
    heading: "Non-Numeric Value",
    config: `
- type: gauge
  entity: plant.bonsai
    `,
  },
];

class DemoGaugeEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards id="demos" configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
    };
  }

  public ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-gauge-card", DemoGaugeEntity);
