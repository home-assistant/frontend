import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Basic card with icons',
    config: `
- type: picture-elements
  image: /images/floorplan.png
  elements:
    - type: icon
      icon: mdi:cctv
      entity: camera.porch
      style:
        top: 92.5%
        left: 16%
        transform: rotate(235deg)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
    - type: icon
      icon: mdi:cctv
      entity: camera.patio
      style:
        top: 4.5%
        left: 16%
        transform: rotate(-60deg) scaleX(-1)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
    - type: icon
      icon: mdi:cctv
      entity: camera.backyard
      style:
        top: 5%
        left: 78%
        transform: rotate(60deg)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
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
