import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("fan", "bed_fan", "on", {
    friendly_name: "Bed Fan",
    speed: "Low",
  }),
  getEntity("fan", "off", "off", {
    supported_features: 1,
  }),
  getEntity("fan", "unavailable", "unavailable", {
    supported_features: 1,
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: fan
  entity: fan.bed_fan
    `,
  },
  {
    heading: "Off",
    config: `
- type: fan
  entity: fan.off
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: fan
  entity: fan.unavailable
    `,
  },
  {
    heading: "Non existing",
    config: `
- type: fan
  entity: fan.nonexisting
    `,
  },
];

class DemoFanEntity extends PolymerElement {
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

customElements.define("demo-hui-fan-card", DemoFanEntity);
