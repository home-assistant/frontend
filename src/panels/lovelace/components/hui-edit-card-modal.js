import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-dialog/paper-dialog.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import "@polymer/paper-menu-button/paper-menu-button.js";
import "@polymer/paper-input/paper-textarea.js";

import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
export class HuiEditCardModal extends EventsMixin(
  LocalizeMixin(PolymerElement)
) {
  static get template() {
    return html`
    <style include="paper-material-styles">
      :host {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
      paper-dialog {
        width: 650px;
      }
      #overlay {
        display: none;
      }
      #overlay.open {
        bottom: 0;
        display: block;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        z-index: 15;
        background: rgba(105, 105, 105, 0.7);
      }
    </style>

    <div id="overlay" on-click="_closeDialog"></div>
    <paper-dialog id="configModal">
      <h2>Card Configuration</h2>
      <paper-dialog-scrollable>
        <paper-textarea value="{{cardConfig}}"></paper-textarea>
      </paper-dialog-scrollable>
      <div class="paper-dialog-buttons">
        <paper-button on-click="_closeDialog">Cancel</paper-button>
        <paper-button on-click="_updateConfig">Accept</paper-button>
      </div>
    </paper-dialog>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      open: {
        type: Boolean,
        notify: true,
        observer: "_openChanged",
      },
      card: Object,
      cardConfig: {
        type: Promise,
      },
    };
  }

  _closeDialog() {
    this.open = false;
  }

  _updateConfig() {
    const newCardConfig = this.shadowRoot.querySelector("paper-textarea").value;

    if (this.cardConfig === newCardConfig) {
      this.open = false;
      return;
    }
    this.hass.callWS({
      type: "lovelace/config/card/update",
      card_id: this.card.id,
      card_config: newCardConfig,
    });
    this.open = false;
  }

  _getCardConfig() {
    if (!this.card) {
      return;
    }

    this.cardConfig = this.hass
      .callWS({
        type: "lovelace/config/card/get",
        card_id: this.card.id,
      })
      .then((resp) => {
        this.cardConfig = resp;
      });
  }

  _openChanged(open) {
    clearTimeout(this._openTimer);
    this._getCardConfig();
    if (open) {
      this._openTimer = setTimeout(() => {
        this.shadowRoot.getElementById("configModal").open();
      }, 50);
      this.shadowRoot.getElementById("overlay").classList.add("open");
    } else {
      this._openTimer = setTimeout(() => {
        this.shadowRoot.getElementById("configModal").close();
      }, 50);
      this.shadowRoot.getElementById("overlay").classList.remove("open");
    }
  }
}
customElements.define("hui-edit-card-modal", HuiEditCardModal);
