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
  private cardId?: any;
  private cardConfig?: any;
  private _dialogClosedCallback?: () => void;

  static get properties() {
    return {
      hass: {},
      open: {},
      cardId: {},
      cardConfig: {},
      _dialogClosedCallback: {},
    };
  }

  public showDialog({ hass, cardID }) {
    this.hass = hass;
    this.cardId = cardID;
    this.open = true;

    this._setCardConfig();
  }

  protected render() {
    return html`
      <style>
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
      <paper-dialog id="dialog" with-backdrop="" .opened="${this.open}">
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

  private async _updateConfig() {
    const newCardConfig = this.shadowRoot!.querySelector("paper-textarea")!
      .value;

    if (this.cardConfig === newCardConfig) {
      this.open = false;
      return;
    }
    try {
      await this.hass!.callWS({
        type: "lovelace/config/card/update",
        card_id: this.cardId,
        card_config: newCardConfig,
      });
      this.open = false;
    } catch (err) {
      alert(`Saving failed: ${err.reason}`);
    }
  }

  private async _setCardConfig() {
    if (!this.cardId || !this.hass) {
      return;
    }

    this.cardConfig = await this.hass
      .callWS({
        type: "lovelace/config/card/get",
        card_id: this.cardId,
      })
      .then((resp) => {
        this.cardConfig = resp;
      });
  }
}
customElements.define("hui-edit-card-modal", HuiEditCardModal);
