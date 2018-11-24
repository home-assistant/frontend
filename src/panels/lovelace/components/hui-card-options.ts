import "@polymer/paper-button/paper-button";
import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  showEditCardDialog,
  registerEditCardDialog,
} from "../editor/hui-dialog-edit-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";

let registeredDialog = false;

export class HuiCardOptions extends LitElement {
  public cardConfig?: LovelaceCardConfig;
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { hass: {} };
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!registeredDialog) {
      registeredDialog = true;
      registerEditCardDialog(this);
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
    showEditCardDialog(this, this.hass!, this.cardConfig!, () =>
      fireEvent(this, "config-refresh")
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}

customElements.define("hui-card-options", HuiCardOptions);
