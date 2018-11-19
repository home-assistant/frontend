import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { LovelaceConfig } from "../types";
import "./hui-edit-card";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiEditCard } from "./hui-edit-card";
import "./hui-migrate-config";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiMigrateConfig } from "./hui-migrate-config";

export class HuiDialogEditCard extends LitElement {
  protected _hass?: HomeAssistant;
  private _cardConfig?: LovelaceConfig;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardConfig: {},
    };
  }

  private get _editDialog(): HuiEditCard {
    return this.shadowRoot!.querySelector("hui-edit-card")!;
  }

  private get _migrateDialog(): HuiMigrateConfig {
    return this.shadowRoot!.querySelector("hui-migrate-config")!;
  }

  public async showDialog({ hass, cardConfig, reloadLovelace }) {
    this._hass = hass;
    this._cardConfig = cardConfig;
    this._reloadLovelace = reloadLovelace;
    await this.updateComplete;
    this._cardConfig!.id
      ? this._editDialog.openDialog()
      : this._migrateDialog.openDialog();
  }

  protected render(): TemplateResult {
    return html`
      ${
        this._cardConfig!.id
          ? html`
              <hui-edit-card
                .cardConfig="${this._cardConfig}"
                .hass="${this._hass}"
                @reload-lovelace="${this._reloadLovelace}"
              >
              </hui-edit-card>
            `
          : html`
              <hui-migrate-config
                .hass="${this._hass}"
                @reload-lovelace="${this._reloadLovelace}"
              ></hui-migrate-config>
            `
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
