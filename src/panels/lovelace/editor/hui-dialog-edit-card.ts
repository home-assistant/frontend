import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/classMap";
import "@polymer/paper-spinner/paper-spinner";
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
  private _saving?: boolean;
  private _migrating?: boolean;
  private _loading?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardConfig: {},
      _dialogClosedCallback: {},
      _saving: {},
      _loading: {},
      _migrating: {},
    };
  }

  public async showDialog({ hass, cardConfig, reloadLovelace }) {
    this._loading = true;
    this._hass = hass;
    this._cardConfig = cardConfig;
    this._reloadLovelace = reloadLovelace;
    this._saving = false;
    this._migrating = false;
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
        .center {
          margin-left: auto;
          margin-right: auto;
        }
        paper-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        .hidden {
          display: none;
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
        <paper-spinner
          ?active="${this._loading}"
          alt="Loading"
          class="center"
        ></paper-spinner>
        <paper-dialog-scrollable>
          ${
            this._cardConfig!.id
              ? html`
                  <hui-edit-card
                    .loading="${this._loading}"
                    ?hidden="${this._loading}"
                    .cardConfig="${this._cardConfig}"
                    .hass="${this._hass}"
                    @loaded-dialog="${this._loaded}"
                    @resize-dialog="${this._resizeDialog}"
                    @close-dialog="${this._closeDialog}"
                    @save-done="${this._saveDone}"
                    @reload-lovelace="${this._reloadLovelace}"
                  >
                  </hui-edit-card>
                `
              : html`
                  <hui-migrate-config
                    .loading="${this._loading}"
                    ?hidden="${this._loading}"
                    .hass="${this._hass}"
                    @loaded-dialog="${this._loaded}"
                    @resize-dialog="${this._resizeDialog}"
                    @close-dialog="${this._closeDialog}"
                    @migrate-done="${this._migrateDone}"
                    @reload-lovelace="${this._reloadLovelace}"
                  ></hui-migrate-config>
                `
          }
        </paper-dialog-scrollable>
        <div
          class="paper-dialog-buttons ${classMap({ hidden: this._loading! })}"
        >
          ${
            this._cardConfig!.id
              ? html`
                  <paper-button @click="${this._toggle}"
                    >${
                      this.localize("ui.panel.lovelace.editor.toggle_editor")
                    }</paper-button
                  >
                  <paper-button
                    ?disabled="${this._saving}"
                    @click="${this._save}"
                  >
                    <paper-spinner
                      ?active="${this._saving}"
                      alt="Saving"
                    ></paper-spinner>
                    ${
                      this.localize("ui.panel.lovelace.editor.save")
                    }</paper-button
                  >
                `
              : html`
                  <paper-button
                    ?disabled="${this._migrating}"
                    @click="
          ${this._migrate}"
                  >
                    <paper-spinner
                      ?active="${this._migrating}"
                      alt="Migrating"
                    ></paper-spinner>
                    ${
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

  private async _loaded(): Promise<void> {
    await this.updateComplete;
    this._loading = false;
    this._resizeDialog();
  }

  private _save(): void {
    this._saving = true;
    this._editCard.updateConfigInBackend();
  }

  private _saveDone(): void {
    this._saving = false;
  }

  private _toggle(): void {
    this._editCard.toggleEditor();
  }

  private _migrate(): void {
    this._migrating = true;
    this._migrateConfig.migrateConfig();
  }

  private _migrateDone(): void {
    this._migrating = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
