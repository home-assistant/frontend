import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeCardSize from '../common/compute-card-size.js';
import createCardElement from '../common/create-card-element.js';
import createErrorConfig from '../common/create-error-card-config.js';

class HuiRowCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          display: flex;
          margin-left: -4px;
          margin-right: -4px;
        }
        #root > * {
          flex: 1 1 0;
          margin: 0 4px;
        }
      </style>
      <div id="root"></div>
    `;
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
      }
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    let size = 1;
    this._elements.forEach((element) => {
      const elSize = computeCardSize(element);
      if (elSize > size) size = elSize;
    });
    return size;
  }

  _configChanged(config) {
    this._elements = [];
    const root = this.$.root;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.cards || !Array.isArray(config.cards)) {
      const error = 'Card config incorrect.';
      const element = createCardElement(createErrorConfig(error, config));
      root.appendChild(element);
      return;
    }

    const elements = [];
    config.cards.forEach((card) => {
      const element = createCardElement(card);
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

customElements.define('hui-row-card', HuiRowCard);
