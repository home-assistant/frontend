import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-dialog/paper-dialog";
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { migrateConfig } from "../common/data";
import "@polymer/paper-button/paper-button";
import { HomeAssistant } from "../../../types";

export class HuiDialogMigrateCard extends LitElement {
  protected hass?: HomeAssistant;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _dialogClosedCallback: {},
    };
  }

  public async showDialog({ hass, reloadLovelace }) {
    this.hass = hass;
    this._reloadLovelace = reloadLovelace;
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
      </style>
      <paper-dialog with-backdrop>
        <h2>Configuration Incompatible</h2>
        <div>
          <p>
            This element doesn't have an ID. Please add an ID to this element in
            'ui-lovelace.yaml'.
          </p>
          <p>
            We can add ID's to all your cards and views automatically for you by
            pressing the 'Migrate config' button.
          </p>
        </div>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._migrateConfig}"
            >Migrate config</paper-button
          >
          <paper-button @click="${this._closeDialog}">Cancel</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private async _migrateConfig(): Promise<void> {
    try {
      await migrateConfig(this.hass!);
      this._dialog.close();
      this._reloadLovelace!();
    } catch (err) {
      alert(`Migration failed: ${err.reason}`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-migrate-card": HuiDialogMigrateCard;
  }
}

customElements.define("hui-dialog-migrate-card", HuiDialogMigrateCard);
