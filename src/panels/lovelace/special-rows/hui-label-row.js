import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-icon.js";

class HuiLabelRow extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate}
    <div class=divider></div>
      <div class=label>
      [[_config.name]]
    </div>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        .label {
          color: var(--primary-color);
          margin-left: 8px;
          margin-bottom: 16px;
          margin-top: 16px;
        }
        .divider {
          height: 1px;
          background-color: var(--secondary-text-color);
          opacity: 0.25;
          margin-left: -16px;
          margin-right: -16px;
          margin-top: 8px;
        }
      </style>
    `;
  }

  static get properties() {
    return {
      _config: Object,
    };
  }

  setConfig(config) {
    if (!config || !config.name) {
      throw new Error("Error in card configuration.");
    }
    this._config = config;
  }
}
customElements.define("hui-label-row", HuiLabelRow);
