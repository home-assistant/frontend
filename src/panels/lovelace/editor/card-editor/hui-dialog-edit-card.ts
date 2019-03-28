import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../../types";
import { HASSDomEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import "./hui-edit-card";
import "./hui-dialog-pick-card";
import { EditCardDialogParams } from "./show-edit-card-dialog";
import { addCard, replaceCard } from "../config-util";

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

@customElement("hui-dialog-edit-card")
export class HuiDialogEditCard extends LitElement {
  @property() protected hass?: HomeAssistant;

  @property() private _params?: EditCardDialogParams;

  @property() private _cardConfig?: LovelaceCardConfig;

  @property() private _newCard?: boolean;

  constructor() {
    super();
    this._cardPicked = this._cardPicked.bind(this);
    this._cancel = this._cancel.bind(this);
    this._save = this._save.bind(this);
  }

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    const [view, card] = params.path;
    this._newCard = card !== undefined ? false : true;
    this._cardConfig =
      card !== undefined
        ? params.lovelace.config.views[view].cards![card]
        : undefined;
  }

  protected render(): TemplateResult | void {
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
        .cardConfig="${this._cardConfig}"
        .closeDialog="${this._cancel}"
        .saveCard="${this._save}"
        .newCard="${this._newCard}"
      >
      </hui-edit-card>
    `;
  }

  private _cardPicked(cardConf: LovelaceCardConfig): void {
    this._cardConfig = cardConf;
  }

  private _cancel(): void {
    this._params = undefined;
    this._cardConfig = undefined;
  }

  private async _save(cardConf: LovelaceCardConfig): Promise<void> {
    const lovelace = this._params!.lovelace;
    await lovelace.saveConfig(
      this._params!.path.length === 1
        ? addCard(lovelace.config, this._params!.path as [number], cardConf)
        : replaceCard(
            lovelace.config,
            this._params!.path as [number, number],
            cardConf
          )
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}
