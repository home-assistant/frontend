import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

class HuiErrorCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          background-color: #ef5350;
          color: white;
          padding: 8px;
          font-weight: 500;
        }
      </style>
      [[_config.error]]
      <pre>[[_toStr(_config.origConfig)]]</pre>
    `;
  }

  static get properties() {
    return {
      _config: Object,
    };
  }

  setConfig(config) {
    this._config = config;
  }

  getCardSize() {
    return 4;
  }

  _toStr(obj) {
    return JSON.stringify(obj, null, 2);
  }
}

customElements.define("hui-error-card", HuiErrorCard);
