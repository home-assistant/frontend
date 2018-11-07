import "@polymer/paper-button/paper-button";
import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";

let registeredDialog = false;

export class HuiCardOptions extends LitElement {
  public cardId?: string;
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
    };
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!registeredDialog) {
      registeredDialog = true;
      fireEvent(this, "register-dialog", {
        dialogShowEvent: "show-edit-card",
        dialogTag: "hui-dialog-edit-card",
        dialogImport: () => import("../editor/hui-dialog-edit-card"),
      });
    }
  }

  protected render() {
    return html`
      <style>
        div {
          border-top: 1px solid #e8e8e8;
          padding: 5px 16px;
          background: var(--paper-card-background-color, white);
          box-shadow: rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
            rgba(0, 0, 0, 0.12) 0px 1px 5px 0px,
            rgba(0, 0, 0, 0.2) 0px 3px 1px -2px;
          text-align: right;
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
        }
      </style>
      <slot></slot>
      <div><paper-button @click="${this._editCard}">EDIT</paper-button></div>
    `;
  }
  private _editCard() {
    fireEvent(this, "show-edit-card", {
      hass: this.hass,
      cardId: this.cardId,
      reloadLovelace: () => fireEvent(this, "config-refresh"),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}

customElements.define("hui-card-options", HuiCardOptions);
