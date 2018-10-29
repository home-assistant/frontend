import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";
import { HomeAssistant } from "../../../types.js";

let registeredDialog = false;

export class HuiCardOptions extends LitElement {
  protected hass?: HomeAssistant;
  private cardID?: string;
  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardID: { type: String },
    };
  }

  public connectedCallback() {
    if (!registeredDialog) {
      registeredDialog = true;
      fireEvent(this, "register-dialog", {
        dialogShowEvent: "show-edit-card",
        dialogTag: "ha-dialog-edit-card",
        dialogImport: () => import("./ha-dialog-edit-card"),
      });
    }
  }

  protected render() {
    return html`
    <style>
      .actions {
        border-top: 1px solid #e8e8e8;
        padding: 5px 16px;
        background: var(--paper-card-background-color, white);
      }
    </style>
    <div>
      <slot></slot>
      <div class="actions">
        <paper-button noink raised .cardID="${this.cardID}" @click="${
      this._editCard
    }">Edit</paper-button>
      </div>
    </div>
    `;
  }
  private _editCard() {
    fireEvent(this, "show-edit-card", {
      hass: this.hass,
      cardID: this.cardID,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}

customElements.define("hui-card-options", HuiCardOptions);
