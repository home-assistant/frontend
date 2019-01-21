import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

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
    friendly_name: "Ecobee",
    supported_features: 1014,
  }),
  getEntity("climate", "nest", "heat", {
    current_temperature: 17,
    min_temp: 15,
    max_temp: 25,
    temperature: 19,
    fan_mode: "Auto Low",
    fan_list: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    operation_mode: "heat",
    operation_list: ["heat", "cool", "auto", "off"],
    hold_mode: "home",
    swing_mode: "Auto",
    swing_list: ["Auto", "1", "2", "3", "Off"],
    friendly_name: "Nest",
    supported_features: 1014,
  }),
];

const CONFIGS = [
  {
    heading: "Range example",
    config: `
- type: thermostat
  entity: climate.ecobee
- type: thermostat
  entity: climate.nest
    `,
  },
  {
    heading: "Single temp example",
    config: `
- type: thermostat
  entity: climate.nest
    `,
  },
];

class DemoThermostatEntity extends PolymerElement {
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

customElements.define("demo-hui-thermostat-card", DemoThermostatEntity);
