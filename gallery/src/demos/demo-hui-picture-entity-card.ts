import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("light", "kitchen_lights", "on", {
    friendly_name: "Kitchen Lights",
  }),
  getEntity("light", "bed_light", "off", {
    friendly_name: "Bed Light",
  }),
];

const CONFIGS = [
  {
    heading: "State on",
    config: `
- type: picture-entity
  image: /images/kitchen.png
  entity: light.kitchen_lights
  tap_action:
    action: toggle
    `,
  },
  {
    heading: "State off",
    config: `
- type: picture-entity
  image: /images/bed.png
  entity: light.bed_light
  tap_action:
    action: toggle
    `,
  },
  {
    heading: "Entity unavailable",
    config: `
- type: picture-entity
  image: /images/living_room.png
  entity: light.non_existing
    `,
  },
  {
    heading: "Camera entity",
    config: `
- type: picture-entity
  entity: camera.demo_camera
    `,
  },
  {
    heading: "Hidden name",
    config: `
- type: picture-entity
  image: /images/kitchen.png
  entity: light.kitchen_lights
  show_name: false
    `,
  },
  {
    heading: "Hidden state",
    config: `
- type: picture-entity
  image: /images/kitchen.png
  entity: light.kitchen_lights
  show_state: false
    `,
  },
  {
    heading: "Both hidden",
    config: `
- type: picture-entity
  image: /images/kitchen.png
  entity: light.kitchen_lights
  show_name: false
  show_state: false
    `,
  },
];

class DemoPicEntity extends PolymerElement {
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

customElements.define("demo-hui-picture-entity-card", DemoPicEntity);
