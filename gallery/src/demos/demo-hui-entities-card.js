import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import getEntity from '../data/entity.js';
import provideHass from '../data/provide_hass.js';
import '../components/demo-cards.js';

const ENTITIES = [
  getEntity('light', 'bed_light', 'on', {
    friendly_name: 'Bed Light'
  }),
  getEntity('group', 'kitchen', 'on', {
    entity_id: [
      'light.bed_light',
    ],
    order: 8,
    friendly_name: 'Kitchen'
  }),
  getEntity('lock', 'kitchen_door', 'locked', {
    friendly_name: 'Kitchen Door'
  }),
  getEntity('cover', 'kitchen_window', 'open', {
    friendly_name: 'Kitchen Window',
    supported_features: 11
  }),
  getEntity('scene', 'romantic_lights', 'scening', {
    entity_id: [
      'light.bed_light',
      'light.ceiling_lights'
    ],
    friendly_name: 'Romantic lights'
  }),
  getEntity('device_tracker', 'demo_paulus', 'home', {
    source_type: 'gps',
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: 'Paulus'
  }),
  getEntity('climate', 'ecobee', 'auto', {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: null,
    target_temp_high: 75,
    target_temp_low: 70,
    fan_mode: 'Auto Low',
    fan_list: ['On Low', 'On High', 'Auto Low', 'Auto High', 'Off'],
    operation_mode: 'auto',
    operation_list: ['heat', 'cool', 'auto', 'off'],
    hold_mode: 'home',
    swing_mode: 'Auto',
    swing_list: ['Auto', '1', '2', '3', 'Off'],
    unit_of_measurement: '°F',
    friendly_name: 'Ecobee',
    supported_features: 1014
  })
];

const CONFIGS = [
  {
    heading: 'Basic',
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - light.non_existing
    - climate.ecobee
    `
  },
  {
    heading: 'With title, toggle-able',
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - climate.ecobee
  title: Random group
    `
  },
  {
    heading: 'With title, toggle = false',
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - climate.ecobee
  title: Random group
  show_header_toggle: false
    `
  },
  {
    heading: 'With title, can\'t toggle',
    config: `
- type: entities
  entities:
    - device_tracker.demo_paulus
  title: Random group
    `
  },
  {
    heading: 'Custom name, secondary info, custom icon',
    config: `
- type: entities
  entities:
    - entity: scene.romantic_lights
      name: ¯\\_(ツ)_/¯
    - entity: device_tracker.demo_paulus
      secondary_info: entity-id
    - entity: cover.kitchen_window
      secondary_info: last-changed
    - entity: group.kitchen
      icon: mdi:home-assistant
    - lock.kitchen_door
    - light.bed_light
    - climate.ecobee
  title: Random group
  show_header_toggle: false
    `
  },
  {
    heading: 'Special rows',
    config: `
- type: entities
  entities:
    - type: weblink
      url: http://google.com/
      icon: mdi:google
      name: Google
    - type: call-service
      icon: mdi:power
      name: Bed light
      action_name: Toggle light
      service: light.toggle
      service_data:
        entity_id: light.bed_light
    - type: divider
    - type: divider
      style:
        height: 30px
        margin: 4px 0
        background: center / contain url("/images/divider.png") no-repeat
    `
  },
];

class DemoEntities extends PolymerElement {
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

customElements.define('demo-hui-entities-card', DemoEntities);
