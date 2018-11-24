import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../types";
import { LovelaceConfig } from "../types";
import { SaveDialogParams } from "./types";

import { saveConfig, migrateConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

const dialogShowEvent = "show-save-config";
const dialogTag = "hui-dialog-save-config";

export const registerSaveDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-save-config"),
  });

export const showSaveDialog = (
  element: HTMLElement,
  hass: HomeAssistant,
  config: LovelaceConfig,
  reloadLovelace: () => void
) => fireEvent(element, dialogShowEvent, { hass, config, reloadLovelace });

export class HuiSaveConfig extends hassLocalizeLitMixin(LitElement) {
  protected _hass?: HomeAssistant;
  private _config?: LovelaceConfig;
  private _reloadLovelace?: () => void;
  private _saving: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardConfig: {},
      _saving: {},
    };
  }

  protected constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(params: SaveDialogParams): Promise<void> {
    this._hass = params.hass;
    this._config = params.config;
    this._reloadLovelace = params.reloadLovelace;
    await this.updateComplete;
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render(): TemplateResult {
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
    if (!this._hass || !this._config) {
      return;
    }
    this._saving = true;
    delete this._config._frontendAuto;
    try {
      await saveConfig(this._hass, this._config, "json");
      await migrateConfig(this._hass);
      this._saving = false;
      this._closeDialog();
      this._reloadLovelace!();
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

customElements.define(dialogTag, HuiSaveConfig);
