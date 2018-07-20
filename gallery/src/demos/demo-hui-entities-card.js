import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import {
  provideHass,
  Entity,
  LightEntity,
  LockEntity,
  GroupEntity,
} from '../data/provide_hass.js';
import '../components/demo-cards.js';

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
  title: Random group
  show_header_toggle: false
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
    hass.addEntities([
      new LightEntity('bed_light', true, {
        friendly_name: 'Bed Light'
      }),
      new Entity('scene', 'romantic_lights', 'scening', {
        entity_id: [
          'light.bed_light',
          'light.ceiling_lights'
        ],
        friendly_name: 'Romantic lights'
      }),
      new Entity('device_tracker', 'demo_paulus', 'home', {
        source_type: 'gps',
        latitude: 32.877105,
        longitude: 117.232185,
        gps_accuracy: 91,
        battery: 71,
        friendly_name: 'Paulus'
      }),
      new Entity('cover', 'kitchen_window', 'open', {
        friendly_name: 'Kitchen Window',
        supported_features: 11
      }),
      new GroupEntity('kitchen', 'on', {
        entity_id: [
          'light.bed_light',
        ],
        order: 8,
        friendly_name: 'Kitchen'
      }),
      new LockEntity('kitchen_door', true, {
        friendly_name: 'Kitchen Door'
      }),
    ])

  }
}

customElements.define('demo-hui-entities-card', DemoEntities);
