import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Without title',
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
    `
  },
  {
    heading: 'With title',
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
  title: Where is Paulus?
    `
  },
  {
    heading: 'Height-Width 1:2',
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
  aspect_ratio: 50%
    `
  },
];

class DemoMap extends PolymerElement {
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

customElements.define('demo-hui-map-card', DemoMap);
