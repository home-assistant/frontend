import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'State on',
    config: `
- type: picture-entity
  image: https://images.pexels.com/photos/1027508/pexels-photo-1027508.jpeg
  entity: light.kitchen_lights
    `
  },
  {
    heading: 'State off',
    config: `
- type: picture-entity
  image: https://images.pexels.com/photos/775219/pexels-photo-775219.jpeg
  entity: light.bed_light
    `
  },
  {
    heading: 'Entity unavailable',
    config: `
- type: picture-entity
  image: https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg
  entity: light.non_existing
    `
  },
  {
    heading: 'Camera entity',
    config: `
- type: picture-entity
  entity: camera.demo_camera
    `
  },
  {
    heading: 'Hidden info',
    config: `
- type: picture-entity
  image: https://images.pexels.com/photos/1027508/pexels-photo-1027508.jpeg
  entity: light.kitchen_lights
  show_info: false
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

customElements.define('demo-hui-picture-entity-card', DemoPicEntity);
