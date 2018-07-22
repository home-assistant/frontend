import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Card with few elements',
    config: `
- type: picture-elements
  image: /images/floorplan.png
  elements:
    - type: service-button
      title: Lights Off
      style:
        top: 97%
        left: 90%
        padding: 0px
      service: light.turn_off
      service_data:
        entity_id: group.all_lights
    - type: icon
      icon: mdi:cctv
      entity: camera.demo_camera
      style:
        top: 12%
        left: 6%
        transform: rotate(-60deg) scaleX(-1)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
    - type: image
      entity: light.ceiling_lights
      tap_action: toggle
      image: /local/light_bulb_off.png
      state_image:
        'on': /local/light_bulb_on.png
      state_filter:
        'on': brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)
        'off': brightness(80%) saturate(0.8)
      style:
        top: 35%
        left: 65%
        width: 7%
        padding: 50px 50px 100px 50px
    - type: state-icon
      entity: binary_sensor.movement_backyard
      style:
        top: 8%
        left: 35%
    `
  },
];

class DemoPicElements extends PolymerElement {
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

customElements.define('demo-hui-picture-elements-card', DemoPicElements);
