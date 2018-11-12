import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceConfig } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import "./hui-edit-card";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiEditCard } from "./hui-edit-card";
import "./hui-migrate-config";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiMigrateConfig } from "./hui-migrate-config";

export class HuiDialogEditCard extends hassLocalizeLitMixin(LitElement) {
  protected _hass?: HomeAssistant;
  private _cardConfig?: LovelaceConfig;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardConfig: {},
      _dialogClosedCallback: {},
    };
  }

  public async showDialog({ hass, cardConfig, reloadLovelace }) {
    this._hass = hass;
    this._cardConfig = cardConfig;
    this._reloadLovelace = reloadLovelace;
    // Wait till dialog is rendered.
    await this.updateComplete;
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private get _editCard(): HuiEditCard {
    return this.shadowRoot!.querySelector("hui-edit-card")!;
  }

  private get _migrateConfig(): HuiMigrateConfig {
    return this.shadowRoot!.querySelector("hui-migrate-config")!;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
      </style>
      <paper-dialog with-backdrop>
        <h2>
          ${
            this._cardConfig!.id
              ? this.localize("ui.panel.lovelace.editor.header")
              : this.localize("ui.panel.lovelace.editor.migrate.header")
          }
        </h2>
        <paper-dialog-scrollable>
          ${
            this._cardConfig!.id
              ? html`
                  <hui-edit-card
                    .cardConfig="${this._cardConfig}"
                    .hass="${this._hass}"
                    @resize-dialog="${this._resizeDialog}"
                    @close-dialog="${this._closeDialog}"
                    @reload-lovelace="${this._reloadLovelace}"
                  >
                  </hui-edit-card>
                `
              : html`
                  <hui-migrate-config
                    .hass="${this._hass}"
                    @resize-dialog="${this._resizeDialog}"
                    @close-dialog="${this._closeDialog}"
                    @reload-lovelace="${this._reloadLovelace}"
                  ></hui-migrate-config>
                `
          }
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${
            this._cardConfig!.id
              ? html`
                  <paper-button
                    @click="
          ${this._toggle}"
                    >${
                      this.localize("ui.panel.lovelace.editor.toggle_editor")
                    }</paper-button
                  >
                  <paper-button
                    @click="
            ${this._save}"
                    >${
                      this.localize("ui.panel.lovelace.editor.save")
                    }</paper-button
                  >
                `
              : html`
                  <paper-button
                    @click="
          ${this._migrate}"
                    >${
                      this.localize("ui.panel.lovelace.editor.migrate.migrate")
                    }</paper-button
                  >
                `
          }
          <paper-button @click="${this._closeDialog}"
            >${this.localize("ui.common.cancel")}</paper-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private _resizeDialog(): void {
    fireEvent(this._dialog, "iron-resize");
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private _save(): void {
    this._editCard.updateConfigInBackend();
  }

  private _toggle(): void {
    this._editCard.toggleEditor();
  }

  private _migrate(): void {
    this._migrateConfig.migrateConfig();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
