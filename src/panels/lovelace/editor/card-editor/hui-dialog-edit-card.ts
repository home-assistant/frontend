import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../../types";
import { HASSDomEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import "./hui-edit-card";
import "./hui-dialog-pick-card";
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
  private _cardConfig?: LovelaceCardConfig;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _params: {},
      _cardConfig: {},
    };
  }

  constructor() {
    super();
    this._cardPicked = this._cardPicked.bind(this);
    this._cancel = this._cancel.bind(this);
  }

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    this._cardConfig =
      params.path.length === 2
        ? (this._cardConfig = params.lovelace.config.views[
            params.path[0]
          ].cards![params.path[1]])
        : undefined;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    if (!this._cardConfig) {
      // Card picker
      return html`
        <hui-dialog-pick-card
          .hass="${this.hass}"
          .cardPicked="${this._cardPicked}"
          .closeDialog="${this._cancel}"
        ></hui-dialog-pick-card>
      `;
    }
    return html`
      <hui-edit-card
        .hass="${this.hass}"
        .lovelace="${this._params.lovelace}"
        .path="${this._params.path}"
        .cardConfig="${this._cardConfig}"
        .closeDialog="${this._cancel}"
      >
      </hui-edit-card>
    `;
  }

  private _cardPicked(cardConf: LovelaceCardConfig) {
    this._cardConfig = cardConf;
  }

  private _cancel() {
    this._params = undefined;
    this._cardConfig = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
