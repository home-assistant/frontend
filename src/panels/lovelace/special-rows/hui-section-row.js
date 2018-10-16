import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-icon.js";

class HuiSectionRow extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate}
      <div class=divider></div>
      <template is="dom-if" if="[[_config.label]]">
        <div class=label>
          [[_config.label]]
        </div>
      </template>
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
    if (!config) {
      throw new Error("Error in card configuration.");
    }
    this._config = config;
  }
}
customElements.define("hui-section-row", HuiSectionRow);
