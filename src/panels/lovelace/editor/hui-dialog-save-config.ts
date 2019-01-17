import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../types";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { SaveDialogParams } from "./show-save-config-dialog";

export class HuiSaveConfig extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  private _params?: SaveDialogParams;
  private _saving: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _params: {},
      _saving: {},
    };
  }

  protected constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(params: SaveDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      <paper-dialog with-backdrop>
        <h2>${this.localize("ui.panel.lovelace.editor.save_config.header")}</h2>
        <paper-dialog-scrollable>
          <p>${this.localize("ui.panel.lovelace.editor.save_config.para")}</p>
          <p>
            ${this.localize("ui.panel.lovelace.editor.save_config.para_sure")}
          </p>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._closeDialog}"
            >${
              this.localize("ui.panel.lovelace.editor.save_config.cancel")
            }</paper-button
          >
          <paper-button
            ?disabled="${this._saving}"
            @click="${this._saveConfig}"
          >
            <paper-spinner
              ?active="${this._saving}"
              alt="Saving"
            ></paper-spinner>
            ${
              this.localize("ui.panel.lovelace.editor.save_config.save")
            }</paper-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        paper-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
      </style>
    `;
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private async _saveConfig(): Promise<void> {
    if (!this.hass || !this._params) {
      return;
    }
    this._saving = true;
    try {
      const lovelace = this._params!.lovelace;
      await lovelace.saveConfig(lovelace.config);
      lovelace.setEditMode(true);
      this._saving = false;
      this._closeDialog();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
      this._saving = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-save-config": HuiSaveConfig;
  }
}

customElements.define("hui-dialog-save-config", HuiSaveConfig);
