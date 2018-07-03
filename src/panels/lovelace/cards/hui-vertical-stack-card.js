import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeCardSize from '../common/compute-card-size.js';
import createCardElement from '../common/create-card-element.js';

class HuiVerticalStackCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          display: flex;
          flex-direction: column;
        }
        #root > * {
          margin: 4px 0 8px 0;
        }
        #root > *:first-child {
          margin-top: 0;
        }
        #root > *:last-child {
          margin-bottom: 0;
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
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  getCardSize() {
    let totalSize = 0;
    this._elements.forEach((element) => {
      totalSize += computeCardSize(element);
    });
    return totalSize;
  }

  setConfig(config) {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error('Card config incorrect');
    }

    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;

    this._elements = [];
    const root = this.$.root;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
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

customElements.define('hui-vertical-stack-card', HuiVerticalStackCard);
