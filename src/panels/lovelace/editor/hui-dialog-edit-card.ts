import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import "./hui-edit-card";
import "./hui-migrate-config";

const dialogShowEvent = "show-edit-card";
const dialogTag = "hui-dialog-edit-config";

export interface EditCardDialogParams {
  cardConfig: LovelaceCardConfig;
  reloadLovelace: () => void;
}

export const registerEditCardDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-card"),
  });

export const showEditCardDialog = (
  element: HTMLElement,
  editCardDialogParams: EditCardDialogParams
) => fireEvent(element, dialogShowEvent, editCardDialogParams);

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _params?: EditCardDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _cardConfig: {},
    };
  }

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    } else {
      return html`
        ${
          this._params.cardConfig!.id
            ? html`
                <hui-edit-card
                  .cardConfig="${this._params.cardConfig}"
                  .hass="${this.hass}"
                  @reload-lovelace="${this._params.reloadLovelace}"
                >
                </hui-edit-card>
              `
            : html`
                <hui-migrate-config
                  .hass="${this.hass}"
                  @reload-lovelace="${this._params.reloadLovelace}"
                ></hui-migrate-config>
              `
        }
      `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define(dialogTag, HuiDialogEditCard);
