import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";
import { EditDialogParams } from "./types";
import { fireEvent } from "../../../common/dom/fire_event";
import "./hui-edit-card";
import "./hui-migrate-config";

const dialogShowEvent = "show-edit-card";
const dialogTag = "hui-dialog-edit-config";

export const registerEditCardDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-card"),
  });

export const showEditCardDialog = (
  element: HTMLElement,
  hass: HomeAssistant,
  cardConfig: LovelaceCardConfig,
  reloadLovelace: () => void
) =>
  fireEvent(element, dialogShowEvent, {
    hass,
    cardConfig,
    reloadLovelace,
  });

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

  public async showDialog(params: EditDialogParams): Promise<void> {
    this._hass = params.hass;
    this._cardConfig = params.cardConfig;
    this._reloadLovelace = params.reloadLovelace;
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

customElements.define(dialogTag, HuiDialogEditCard);
