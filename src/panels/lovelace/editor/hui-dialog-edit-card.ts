import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../types";
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

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

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
    }
    if (!this._params.cardConfig.id) {
      return html`
        <hui-migrate-config
          .hass="${this.hass}"
          @reload-lovelace="${this._params.reloadLovelace}"
        ></hui-migrate-config>
      `;
    }
    return html`
      <hui-edit-card
        .cardConfig="${this._params.cardConfig}"
        .hass="${this.hass}"
        @reload-lovelace="${this._params.reloadLovelace}"
      >
      </hui-edit-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define(dialogTag, HuiDialogEditCard);
