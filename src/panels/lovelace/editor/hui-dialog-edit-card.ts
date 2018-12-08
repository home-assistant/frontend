import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import "./hui-edit-card";
import { EditCardDialogParams } from "./show-edit-card-dialog";

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
      _params: {},
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
    return html`
      <hui-edit-card
        .hass="${this.hass}"
        .config="${this._params.config}"
        .path="${this._params.path}"
        .add="${this._params.add}"
        @reload-lovelace="${this._params.reloadLovelace}"
        @cancel-edit-card="${this._cancel}"
      >
      </hui-edit-card>
    `;
  }

  private _cancel() {
    this._params = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
