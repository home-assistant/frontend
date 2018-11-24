import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";
import "./hui-edit-card";
import "./hui-migrate-config";

export class HuiDialogEditCard extends LitElement {
  protected _hass?: HomeAssistant;
  private _cardConfig?: LovelaceCardConfig;
  private _reloadLovelace?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardConfig: {},
    };
  }

  public async showDialog({ hass, cardConfig, reloadLovelace }): Promise<void> {
    this._hass = hass;
    this._cardConfig = cardConfig;
    this._reloadLovelace = reloadLovelace;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
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
