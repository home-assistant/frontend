import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Basic example',
    config: `
- type: glance
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'With title',
    config: `
- type: glance
  title: This is glance
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'Custom column width',
    config: `
- type: glance
  column_width: calc(100% / 7)
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'No name',
    config: `
- type: glance
  show_name: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'No state',
    config: `
- type: glance
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'No name and no state',
    config: `
- type: glance
  show_name: false
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'Custom name, custom icon',
    config: `
- type: glance
  entities:
    - entity: device_tracker.demo_paulus
      name: ¯\\_(ツ)_/¯
      icon: mdi:home-assistant
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - entity: light.kitchen_lights
      icon: mdi:alarm-light
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
  {
    heading: 'Custom tap action',
    config: `
- type: glance
  entities:
    - entity: lock.kitchen_door
      tap_action: toggle
    - entity: light.ceiling_lights
      tap_action: call-service
      service: light.turn_on
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    `
  },
  {
    heading: 'Selectively hidden name',
    config: `
- type: glance
  entities:
    - device_tracker.demo_paulus
    - entity: media_player.living_room
      name:
    - sun.sun
    - entity: cover.kitchen_window
      name:
    - light.kitchen_lights
    `
  },
  {
    heading: 'Primary theme',
    config: `
- type: glance
  theming: primary
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `
  },
];

class DemoPicEntity extends PolymerElement {
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

customElements.define('demo-hui-glance-card', DemoPicEntity);
