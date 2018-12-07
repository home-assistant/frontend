import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../data/lovelace";
import "./hui-edit-card";
import "./hui-migrate-config";

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

export interface EditCardDialogParams {
  cardConfig?: LovelaceCardConfig;
  viewId?: string | number;
  add: boolean;
  reloadLovelace: () => void;
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
    if (
      (!this._params.add &&
        this._params.cardConfig &&
        !this._params.cardConfig.id) ||
      (this._params.add && !this._params.viewId)
    ) {
      return html`
        <hui-migrate-config
          .hass="${this.hass}"
          @reload-lovelace="${this._params.reloadLovelace}"
        ></hui-migrate-config>
      `;
    }
    return html`
      <hui-edit-card
        .hass="${this.hass}"
        .viewId="${this._params.viewId}"
        .cardConfig="${this._params.cardConfig}"
        @reload-lovelace="${this._params.reloadLovelace}"
        @cancel-edit-card="${this._cancel}"
      >
      </hui-edit-card>
    `;
  }

  private _cancel() {
    this._params = {
      add: false,
      reloadLovelace: () => {
        return;
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
