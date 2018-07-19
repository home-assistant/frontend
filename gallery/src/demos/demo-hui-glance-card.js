import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-card.js';

const CONFIGS = [
  {
    heading: 'Basic example',
    config: `type: glance
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'With title',
    config: `type: glance
title: This is glance
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'Custom column width',
    config: `type: glance
column_width: calc(100% / 7)
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'No name',
    config: `type: glance
show_name: false
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'No state',
    config: `type: glance
show_state: false
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'No name and no state',
    config: `type: glance
show_name: false
show_state: false
entities:
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'Custom name',
    config: `type: glance
entities:
  - entity: device_tracker.demo_paulus
    name: ¯\\_(ツ)_/¯
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights
  - lock.kitchen_door
  - light.ceiling_lights`
  },
  {
    heading: 'Custom tap action',
    config: `type: glance
entities:
  - entity: lock.kitchen_door
    tap_action: toggle
  - entity: light.ceiling_lights
    tap_action: turn-on
  - device_tracker.demo_paulus
  - media_player.living_room
  - sun.sun
  - cover.kitchen_window
  - light.kitchen_lights`
  },
];

class DemoPicEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-card type="hui-glance-card" configs="[[_configs]]"></demo-card>
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
