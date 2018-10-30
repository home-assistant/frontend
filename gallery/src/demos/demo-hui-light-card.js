import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
    brightness: 130,
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: light
  entity: light.bed_light
    `,
  },
];

class DemoLightEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards id='demos' configs="[[_configs]]"></demo-cards>
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

customElements.define("demo-hui-light-card", DemoLightEntity);
