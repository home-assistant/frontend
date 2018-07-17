import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeUnusedEntities from './common/compute-unused-entities.js';
import createCardElement from './common/create-card-element.js';

import './cards/hui-entities-card.js';

class HuiUnusedEntities extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          max-width: 600px;
          margin: 0 auto;
          padding: 8px 0;
        }
        hui-entities-card {
          display: block;
          margin-bottom: 8px;
        }
      </style>
      <div id="root"></div>
    `;
  }

  constructor() {
    super();
    this._elements = [];
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      config: {
        type: Object,
        observer: '_configChanged'
      },
    };
  }

  _configChanged(config) {
    const root = this.$.root;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const entities = computeUnusedEntities(this.hass, config);
    const elements = [];

    entities.forEach((entity) => {
      const cardConfig = {
        type: 'entities',
        title: entity,
        entities: [entity],
        show_header_toggle: false
      };
      const element = createCardElement(cardConfig);
      element.hass = this.hass;
      elements.push(element);
      root.appendChild(element);
    });
    this._elements = elements;
  }

  _hassChanged(hass) {
    this._elements.forEach((element) => {
      element.hass = hass;
    });
  }
}
customElements.define('hui-unused-entities', HuiUnusedEntities);
