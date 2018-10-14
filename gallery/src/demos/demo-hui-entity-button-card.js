import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: entity-button
  entity: light.bed_light
    `,
  },
  {
    heading: "With Name",
    config: `
- type: entity-button
  name: Bedroom
  entity: light.bed_light
    `,
  },
  {
    heading: "With Icon",
    config: `
- type: entity-button
  entity: light.bed_light
  icon: mdi:hotel
    `,
  },
  {
    heading: "Without State",
    config: `
- type: entity-button
  entity: light.bed_light
  show_state: false
    `,
  },
  {
    heading: "Setting Color",
    config: `
- type: entity-button
  entity: light.bed_light
  color: blue
    `,
  },
  {
    heading: "Custom Tap Action (toggle)",
    config: `
- type: entity-button
  entity: light.bed_light
  tap_action: toggle
    `,
  },
  {
    heading: "Running Service",
    config: `
- type: entity-button
  entity: light.bed_light
  service: light.toggle
    `,
  },
  {
    heading: "Invalid Entity",
    config: `
- type: entity-button
  entity: sensor.invalid_entity
    `,
  },
];

class DemoEntityButtonEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards id='demos' hass='[[hass]]' configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
      hass: Object,
    };
  }

  ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-entity-button-card", DemoEntityButtonEntity);
