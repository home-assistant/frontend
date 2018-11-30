import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "./hui-add-card";
import "./hui-migrate-config";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
    "show-add-card": AddCardDialogParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

const dialogShowEvent = "show-add-card";
const dialogTag = "hui-dialog-add-card";

export interface AddCardDialogParams {
  viewId: string | number | undefined;
  reloadLovelace: () => void;
}

export const registerAddCardDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-add-card"),
  });

export const showAddCardDialog = (
  element: HTMLElement,
  addCardDialogParams: AddCardDialogParams
) => fireEvent(element, dialogShowEvent, addCardDialogParams);

export class HuiDialogAddCard extends LitElement {
  protected hass?: HomeAssistant;
  private _params?: AddCardDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _params: {},
    };
  }

  public async showDialog(params: AddCardDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    if (!this._params.viewId) {
      return html`
        <hui-migrate-config
          .hass="${this.hass}"
          @reload-lovelace="${this._params.reloadLovelace}"
        ></hui-migrate-config>
      `;
    }
    return html`
      <hui-add-card
        .viewId="${this._params.viewId}"
        .hass="${this.hass}"
        @reload-lovelace="${this._params.reloadLovelace}"
      ></hui-add-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-add-card": HuiDialogAddCard;
  }
}

customElements.define(dialogTag, HuiDialogAddCard);
