import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/demo-cards";

const CONFIGS = [
  {
    heading: "Title, dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "Title, dialog, no toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "Title, no dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    `,
  },
  {
    heading: "No title, dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "No title, dialog, no toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "No title, no dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom icon",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - entity: switch.decorative_lights
      icon: mdi:power
    - binary_sensor.basement_floor_wet
    `,
  },
];

class DemoPicGlance extends PolymerElement {
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

customElements.define("demo-hui-picture-glance-card", DemoPicGlance);
