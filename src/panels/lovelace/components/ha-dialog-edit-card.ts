import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-input/paper-textarea.js";
import "@polymer/paper-dialog/paper-dialog.js";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog.js";
import { HomeAssistant } from "../../../types";
import { getCardConfig, updateCardConfig } from "../common/data";

export class HuiEditCardModal extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _cardConfig?: string;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: {
        type: Number,
      },
      _cardConfig: {},
      _dialogClosedCallback: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._loadConfig();
    // Wait till dialog is rendered.
    await this.updateComplete;
    this._dialog.open();
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
      <paper-dialog with-backdrop>
        <h2>Card Configuration</h2>
        <paper-textarea
          value="${this._cardConfig}"
        ></paper-textarea>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._closeDialog}">Cancel</paper-button>
          <paper-button @click="${this._updateConfig}">Save</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  private async _loadConfig() {
    this._cardConfig = await getCardConfig(this.hass!, this._cardId!);
    await this.updateComplete;
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private async _updateConfig() {
    const newCardConfig = this.shadowRoot!.querySelector("paper-textarea")!
      .value;

    if (this._cardConfig === newCardConfig) {
      this._dialog.close();
      return;
    }
    try {
      await updateCardConfig(this.hass!, this._cardId!, newCardConfig);
      this._dialog.close();
      this._reloadLovelace!();
    } catch (err) {
      alert(`Saving failed: ${err.reason}`);
    }
  }
}
customElements.define("ha-dialog-edit-card", HuiEditCardModal);
