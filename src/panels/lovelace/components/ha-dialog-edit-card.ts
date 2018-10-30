import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import "@polymer/paper-menu-button/paper-menu-button.js";
import "@polymer/paper-input/paper-textarea.js";
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog.js";
import { HomeAssistant } from "../../../types";
import { getCardConfig, updateCardConfig } from "../common/data";

export class HuiEditCardModal extends LitElement {
  protected hass?: HomeAssistant;
  private open?: boolean;
  private _cardId?: string;
  private _cardConfig?: string;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      open: {
        type: Boolean,
      },
      cardId: {
        type: Number,
      },
      _cardConfig: {},
      _dialogClosedCallback: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this.open = true;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._cardConfig = await getCardConfig(hass, cardId);
    await this.updateComplete;
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render() {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
      </style>
      <paper-dialog with-backdrop .opened="${this.open}">
        <h2>Card Configuration</h2>
        <paper-dialog-scrollable>
          <paper-textarea value="${this._cardConfig}"></paper-textarea>
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

    if (this._cardConfig === newCardConfig) {
      this.open = false;
      return;
    }
    try {
      await updateCardConfig(this.hass!, this._cardId!, newCardConfig);
      this.open = false;
      this._reloadLovelace!();
    } catch (err) {
      alert(`Saving failed: ${err.reason}`);
    }
  }
}
customElements.define("ha-dialog-edit-card", HuiEditCardModal);
