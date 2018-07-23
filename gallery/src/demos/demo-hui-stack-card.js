import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Vertical Stack',
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
    `
  },
  {
    heading: 'Horizontal Stack',
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
    `
  },
  {
    heading: 'Combination of both',
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
    `
  },
];

class DemoStack extends PolymerElement {
  static get template() {
    return html`
      <demo-cards configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS
      }
    };
  }
}

customElements.define('demo-hui-stack-card', DemoStack);
