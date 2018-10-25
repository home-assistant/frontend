import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("climate", "ecobee", "auto", {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: null,
    target_temp_high: 75,
    target_temp_low: 70,
    fan_mode: "Auto Low",
    fan_list: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    operation_mode: "auto",
    operation_list: ["heat", "cool", "auto", "off"],
    hold_mode: "home",
    swing_mode: "Auto",
    swing_list: ["Auto", "1", "2", "3", "Off"],
    unit_of_measurement: "°F",
    friendly_name: "Ecobee",
    supported_features: 1014,
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: thermostat
  entity: climate.ecobee
    `,
  },
];

class DemoThermostatEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards
        id='demos'
        configs="[[_configs]]"
      ></demo-cards>
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

  ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-thermostat-card", DemoThermostatEntity);
