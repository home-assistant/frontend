import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
    brightness: 255,
  }),
  getEntity("light", "dim_on", "on", {
    friendly_name: "Dining Room",
    supported_features: 1,
    brightness: 100,
  }),
  getEntity("light", "dim_off", "off", {
    friendly_name: "Dining Room",
    supported_features: 1,
  }),
  getEntity("light", "unavailable", "unavailable", {
    friendly_name: "Lost Light",
    supported_features: 1,
  }),
];

const CONFIGS = [
  {
    heading: "Switchable Light",
    config: `
- type: light
  entity: light.bed_light
    `,
  },
  {
    heading: "Dimmable Light On",
    config: `
- type: light
  entity: light.dim_on
    `,
  },
  {
    heading: "Dimmable Light Off",
    config: `
- type: light
  entity: light.dim_off
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: light
  entity: light.unavailable
    `,
  },
  {
    heading: "Non existing",
    config: `
- type: light
  entity: light.nonexisting
    `,
  },
];

class DemoLightEntity extends PolymerElement {
  static get template() {
    return html` <demo-cards id="demos" configs="[[_configs]]"></demo-cards> `;
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
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-light-card", DemoLightEntity);
