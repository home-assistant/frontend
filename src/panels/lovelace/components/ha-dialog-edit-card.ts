import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-dialog/paper-dialog.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import "@polymer/paper-menu-button/paper-menu-button.js";
import "@polymer/paper-input/paper-textarea.js";
import { HomeAssistant } from "../../../types";

export class HuiEditCardModal extends LitElement {
  protected hass?: HomeAssistant;
  private open?: boolean;
  private card?: any;
  private cardConfig?: any;
  private _dialogClosedCallback?: () => void;

  static get properties() {
    return {
      hass: {},
      open: {},
      cardID: {},
      cardConfig: {},
      _dialogClosedCallback: {},
    };
  }

  protected render() {
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
          <paper-textarea value="${this.cardConfig}"></paper-textarea>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._closeDialog}">Cancel</paper-button>
          <paper-button @click="${this._updateConfig}">Accept</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _closeDialog() {
    this.open = false;
  }

  private _updateConfig() {
    if (!this.hass) {
      return;
    }
    const newCardConfig = this.shadowRoot!.querySelector("paper-textarea")!
      .value;

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

  private _getCardConfig() {
    if (!this.card || !this.hass) {
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

  private _openChanged(open) {
    if (!this.shadowRoot) {
      return;
    }
    this._getCardConfig();
    if (this.open) {
      this.shadowRoot.getElementById("overlay")!.classList.add("open");
    } else {
      this.shadowRoot.getElementById("overlay")!.classList.remove("open");
    }
  }
}
customElements.define("hui-edit-card-modal", HuiEditCardModal);
