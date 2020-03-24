import {
  css,
  html,
  LitElement,
  TemplateResult,
  CSSResultArray,
  customElement,
  property,
  query,
} from "lit-element";

import "./hui-card-preview";
import "../../../../components/dialog/ha-paper-dialog";

import deepFreeze from "deep-freeze";

// tslint:disable-next-line
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import { DeleteCardDialogParams } from "./show-delete-card-dialog";

@customElement("hui-dialog-delete-card")
export class HuiDialogDeleteCard extends LitElement {
  @property() protected hass!: HomeAssistant;
  @property() private _params?: DeleteCardDialogParams;
  @property() private _cardConfig?: LovelaceCardConfig;
  @query("ha-paper-dialog") private _dialog?: HaPaperDialog;

  public async showDialog(params: DeleteCardDialogParams): Promise<void> {
    this._params = params;
    this._cardConfig = params.cardConfig;
    if (!Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
    if (this._dialog) {
      this._dialog.open();
    }
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog with-backdrop opened>
        <h2>
          ${this.hass.localize("ui.panel.lovelace.cards.confirm_delete")}
        </h2>
        <paper-dialog-scrollable>
          ${this._cardConfig
            ? html`
                <div class="element-preview">
                  <hui-card-preview
                    .hass=${this.hass}
                    .config="${this._cardConfig}"
                  ></hui-card-preview>
                </div>
              `
            : ""}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._close}">
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          <mwc-button class="warning" @click="${this._delete}">
            ${this.hass!.localize("ui.common.delete")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        .element-preview {
          position: relative;
        }
        hui-card-preview {
          margin: 4px auto;
          max-width: 500px;
          display: block;
          width: 100%;
        }
      `,
    ];
  }

  private _close(): void {
    this._params = undefined;
    this._cardConfig = undefined;
  }

  private _delete(): void {
    if (!this._params?.deleteCard) {
      return;
    }
    this._params.deleteCard();
    this._close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-delete-card": HuiDialogDeleteCard;
  }
}
