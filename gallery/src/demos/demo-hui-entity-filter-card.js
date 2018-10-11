import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../components/demo-cards.js";

const CONFIGS = [
  {
    heading: "Basic",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  state_filter:
    - "on"
    - not_home
    `,
  },
  {
    heading: "With card config",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  state_filter:
    - "on"
    - not_home
  card:
    type: glance
    show_state: false
    `,
  },
  {
    heading: "Showing single entity conditionally",
    config: `
- type: entity-filter
  entities:
    - media_player.lounge_room
  state_filter:
    - 'playing'
  card:
    type: media-control
    entity: media_player.lounge_room
    `,
  },
];

class DemoFilter extends PolymerElement {
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

customElements.define("demo-hui-entity-filter-card", DemoFilter);
