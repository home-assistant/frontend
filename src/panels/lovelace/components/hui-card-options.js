import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";

import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-card.js";

export class HuiCardOptions extends PolymerElement {
  static get template() {
    return html`
    <style>
      .actions {
        border-top: 1px solid #e8e8e8;
        padding: 5px 16px;
        background: var(--paper-card-background-color, white);
      }
    </style>
    <ha-card>
      <slot></slot>
      <div class="actions">
        <paper-button noink raised on-click="_editCard">Edit</paper-button>
      </div>
    </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      card: Object,
      editOpen: Boolean,
    };
  }

  _editCard() {
    this.editOpen = true;
  }
}
customElements.define("hui-card-options", HuiCardOptions);
