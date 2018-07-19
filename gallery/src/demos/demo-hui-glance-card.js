import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/panels/lovelace/cards/hui-glance-card.js';

import HomeAssistant from '../data/hass.js';
import demoStates from '../data/demo_dump.js';

const CONFIGS = [
  {
    entities: [
      'binary_sensor.movement_backyard',
      'light.bed_light',
      'binary_sensor.basement_floor_wet',
      'sensor.outside_temperature',
      'light.ceiling_lights',
      'switch.ac',
      'lock.kitchen_door'
    ],
    type: 'glance',
    title: 'Glance card sample'
  },
  {
    entities: [
      'binary_sensor.movement_backyard',
      'light.bed_light',
      'binary_sensor.basement_floor_wet',
      'sensor.outside_temperature',
      'light.ceiling_lights',
      'switch.ac',
      'lock.kitchen_door'
    ],
    type: 'glance',
  },
  {
    entities: [
      'lock.kitchen_door'
    ],
    type: 'glance',
  },

];

class DemoPicEntity extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
        }
        hui-glance-card {
          width: 400px;
          display: inline-block;
          margin-left: 20px;
          margin-top: 20px;
        }
      </style>
      <div id='root'>
      </div>
    `;
  }

  ready() {
    super.ready();

    const root = this.$.root;
    const hass = new HomeAssistant();
    hass.states = demoStates;
    console.log(demoStates);
    CONFIGS.forEach((config) => {
      const el = document.createElement('hui-glance-card');
      el.setConfig(config);
      el.hass = hass;
      root.appendChild(el);
    });
  }
}

customElements.define('demo-hui-glance-card', DemoPicEntity);
