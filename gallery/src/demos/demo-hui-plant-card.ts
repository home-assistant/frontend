import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";
import { createPlantEntities } from "../data/plants";

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: plant-status
  entity: plant.lemon_tree
    `,
  },
  {
    heading: "Problem (too bright) + low battery",
    config: `
- type: plant-status
  entity: plant.apple_tree
    `,
  },
  {
    heading: "With picture + multiple problems",
    config: `
- type: plant-status
  entity: plant.sunflowers
  name: Sunflowers Name Overwrite
    `,
  },
];

class DemoPlantEntity extends PolymerElement {
  static get template() {
    return html`<demo-cards id="demos" configs="[[_configs]]"></demo-cards>`;
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
    hass.addEntities(createPlantEntities());
  }
}

customElements.define("demo-hui-plant-card", DemoPlantEntity);
