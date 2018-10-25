import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("climate", "ecobee", "auto", {
    friendly_name: "Thermostat",
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

customElements.define("demo-hui-thermostat-card", DemoThermostatEntity);
