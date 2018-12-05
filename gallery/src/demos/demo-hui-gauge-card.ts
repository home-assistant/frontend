import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/demo-cards";

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
      <demo-cards configs="[[_configs]]"></demo-cards>
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
}

customElements.define("demo-hui-gauge-card", DemoGaugeEntity);
