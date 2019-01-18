import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("light", "kitchen_lights", "on", {
    friendly_name: "Kitchen Lights",
  }),
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Lights",
  }),
  getEntity("device_tracker", "demo_paulus", "work", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("device_tracker", "demo_anne_therese", "school", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Anne Therese",
  }),
  getEntity("device_tracker", "demo_home_boy", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Home Boy",
  }),
];

const CONFIGS = [
  {
    heading: "Vertical Stack",
    config: `
- type: vertical-stack
  cards:
    - type: picture-entity
      image: /images/kitchen.png
      entity: light.kitchen_lights
    - type: glance
      entities:
        - device_tracker.demo_anne_therese
        - device_tracker.demo_home_boy
        - device_tracker.demo_paulus
    `,
  },
  {
    heading: "Horizontal Stack",
    config: `
- type: horizontal-stack
  cards:
    - type: picture-entity
      image: /images/kitchen.png
      entity: light.kitchen_lights
    - type: glance
      entities:
        - device_tracker.demo_anne_therese
        - device_tracker.demo_home_boy
        - device_tracker.demo_paulus
    `,
  },
  {
    heading: "Combination of both",
    config: `
- type: vertical-stack
  cards:
    - type: horizontal-stack
      cards:
        - type: picture-entity
          image: /images/kitchen.png
          entity: light.kitchen_lights
        - type: glance
          entities:
            - device_tracker.demo_anne_therese
            - device_tracker.demo_home_boy
            - device_tracker.demo_paulus
    - type: picture-entity
      image: /images/bed.png
      entity: light.bed_light
    `,
  },
];

class DemoStack extends PolymerElement {
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

customElements.define("demo-hui-stack-card", DemoStack);
