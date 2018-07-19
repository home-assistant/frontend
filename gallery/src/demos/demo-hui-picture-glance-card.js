import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/panels/lovelace/cards/hui-picture-glance-card.js';

import HomeAssistant from '../data/hass.js';
import demoStates from '../data/demo_dump.js';

const CONFIGS = [
  {
    type: 'picture-glance',
    image: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=495',
    title: 'Picture glance',
    entities: [
      'switch.decorative_lights',
      'light.ceiling_lights',
      'binary_sensor.movement_backyard',
      'binary_sensor.basement_floor_wet',
    ]
  },
  {
    type: 'picture-glance',
    image: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=495',
    entities: [
      'switch.decorative_lights',
      'light.ceiling_lights',
      'binary_sensor.movement_backyard',
      'binary_sensor.basement_floor_wet',
    ]
  },
  {
    type: 'picture-glance',
    image: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=495',
    title: 'Picture glance',
    entities: [
      'switch.decorative_lights',
      'light.ceiling_lights',
    ]
  },
  {
    type: 'picture-glance',
    image: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=495',
    entities: [
      'switch.decorative_lights',
      'light.ceiling_lights',
    ]
  },
  {
    type: 'picture-glance',
    image: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=495',
    entities: [
      'binary_sensor.movement_backyard',
      'binary_sensor.basement_floor_wet',
    ]
  },
];

class DemoPicGlance extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          padding: 10px;
        }
        hui-picture-glance-card {
          width: 400px;
          display: inline-block;
          margin: 10px;
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
      const el = document.createElement('hui-picture-glance-card');
      el.setConfig(config);
      el.hass = hass;
      root.appendChild(el);
    });
  }
}

customElements.define('demo-hui-picture-glance-card', DemoPicGlance);
