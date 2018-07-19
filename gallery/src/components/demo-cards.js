import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './demo-card.js';

class DemoCards extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          display: flex;
          flex-wrap: wrap;
        }
        #root > * {
          flex-basis: 600px;
          padding: 8px 8px 32px 8px;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      type: String,
      configs: {
        type: Object,
        observer: '_configsChanged'
      }
    };
  }

  _configsChanged(configs) {
    const root = this.$.root;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    configs.forEach((config) => {
      const el = document.createElement('demo-card');
      el.config = config;
      el.type = this.type;
      root.appendChild(el);
    });
  }
}

customElements.define('demo-cards', DemoCards);
