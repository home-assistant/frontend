import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-icon.js";

class HuiLabelRow extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate}
      <div>
        <ha-icon icon="[[_config.icon]]"></ha-icon>
        <div id=name>
          [[_config.name]]
        </div>
      </div>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        div {
          display: flex;
          align-items: center;
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        #name {
          @apply --paper-font-subhead
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-left: 16px;
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
    if (!config || !config.icon || !config.name) {
      throw new Error("Error in card configuration.");
    }
    this._config = config;
  }
}
customElements.define("hui-label-row", HuiLabelRow);
