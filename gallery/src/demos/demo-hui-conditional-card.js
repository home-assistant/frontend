import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import getEntity from '../data/entity.js';
import provideHass from '../data/provide_hass.js';
import '../components/demo-cards.js';

const ENTITIES = [
  getEntity('light', 'controller_1', 'on', {
    friendly_name: 'Controller 1'
  }),
  getEntity('light', 'controller_2', 'on', {
    friendly_name: 'Controller 2'
  }),
  getEntity('light', 'floor', 'off', {
    friendly_name: 'Floor light'
  }),
  getEntity('light', 'kitchen', 'on', {
    friendly_name: 'Kitchen light'
  }),
];

const CONFIGS = [
  {
    heading: 'Controller',
    config: `
- type: entities
  entities:
    - light.controller_1
    - light.controller_2
    - type: divider
    - light.floor
    - light.kitchen
    `
  },
  {
    heading: 'Demo',
    config: `
- type: conditional
  conditions:
    - entity: light.controller_1
      state: "on"
    - entity: light.controller_2
      state_not: "off"
  card:
    type: entities
    entities:
      - light.controller_1
      - light.controller_2
      - light.floor
      - light.kitchen
    `
  },
];

class DemoConditional extends PolymerElement {
  static get template() {
    return html`
      <demo-cards
        id='demos'
        hass='[[hass]]'
        configs="[[_configs]]"
      ></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS
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

customElements.define('demo-hui-conditional-card', DemoConditional);
