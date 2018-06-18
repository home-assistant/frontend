import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiErrorCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          background-color: red;
          color: white;
          text-align: center;
          padding: 8px;
        }
      </style>
      [[config.error]]
    `;
  }

  static get properties() {
    return {
      config: Object
    };
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('hui-error-card', HuiErrorCard);
