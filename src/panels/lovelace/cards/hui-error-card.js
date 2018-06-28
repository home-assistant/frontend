import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiErrorCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          background-color: red;
          color: white;
          padding: 8px;
        }
      </style>
      [[config.error]]
      <pre>[[_toStr(config.origConfig)]]</pre>
    `;
  }

  static get properties() {
    return {
      config: Object,
    };
  }

  getCardSize() {
    return 4;
  }

  _toStr(obj) {
    return JSON.stringify(obj, null, 2);
  }
}

customElements.define('hui-error-card', HuiErrorCard);
