import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-button/paper-button";
import "@polymer/paper-dialog/paper-dialog";
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";

import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { migrateConfig } from "../common/data";

export class HuiDialogMigrate extends hassLocalizeLitMixin(LitElement) {
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
    await this.updateComplete;
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
        <h2>${this.localize("ui.panel.lovelace.editor.migrate.header")}</h2>
        <div>
          <p>${this.localize("ui.panel.lovelace.editor.migrate.para_no_id")}</p>
          <p>
            ${this.localize("ui.panel.lovelace.editor.migrate.para_migrate")}
          </p>
        </div>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._migrateConfig}"
            >${
              this.localize("ui.panel.lovelace.editor.migrate.migrate_btn")
            }</paper-button
          >
          <paper-button @click="${this._closeDialog}"
            >${this.localize("ui.common.cancel")}</paper-button
          >
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
      alert(`Migration failed: ${err.message}`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-migrate": HuiDialogMigrate;
  }
}

customElements.define("hui-dialog-migrate", HuiDialogMigrate);
