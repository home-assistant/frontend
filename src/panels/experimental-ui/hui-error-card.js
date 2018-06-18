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
      [[_error]]
    `;
  }

  static get properties() {
    return {
      config: Object,
      _error: {
        type: String,
        computed: 'computeError(config)'
      }
    };
  }

  computeError(config) {
    return this._error || config._error;
  }

  getCardSize() {
    return 12;
  }
}

customElements.define('hui-error-card', HuiErrorCard);
