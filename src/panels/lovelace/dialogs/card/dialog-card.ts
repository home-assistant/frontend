import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import "../../../../components/dialog/ha-paper-dialog";

import { HomeAssistant } from "../../../../types";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyleDialog } from "../../../../resources/styles";
import { CardDialogParams } from "./show-dialog-card";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { createCardElement } from "../../common/create-card-element";
import { LovelaceCard } from "../../types";

@customElement("dialog-card")
class DialogCard extends LitElement {
  @property() private _hass!: HomeAssistant;
  @property() private _params?: CardDialogParams;

  public async showDialog(params: CardDialogParams): Promise<void> {
    this._params = params;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    const element = this.shadowRoot!.querySelector("#card > *") as LovelaceCard;
    if (element) {
      element.hass = hass;
    }
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        id="card"
        opened
        @opened-changed="${this._openedChanged}"
      >
        ${this._renderCard(this._params.card)}
      </ha-paper-dialog>
    `;
  }

  private _renderCard(config: LovelaceCardConfig): TemplateResult {
    const element = createCardElement(config);
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`
      ${element}
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
          max-width: 500px;
        }
        @media (max-width: 400px) {
          ha-paper-dialog {
            min-width: initial;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-card": DialogCard;
  }
}
