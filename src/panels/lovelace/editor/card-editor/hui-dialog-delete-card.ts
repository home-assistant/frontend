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
          <mwc-button class="delete" @click="${this._delete}">
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
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 850px) {
          ha-paper-dialog {
            width: 845px;
          }
        }
        ha-paper-dialog {
          max-width: 845px;
        }
        .element-preview {
          position: relative;
        }
        hui-card-preview {
          padding-top: 8px;
          margin: 4px auto;
          max-width: 390px;
          display: block;
          width: 100%;
        }
        .delete {
          --mdc-theme-primary: red;
        }
      `,
    ];
  }

  private _close(): void {
    this._dialog!.close();
    this._params = undefined;
    this._cardConfig = undefined;
  }

  private _delete(): void {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.deleteCard
    ) {
      return;
    }
    this._params.deleteCard(this._params.lovelaceConfig, this._params.path);
    this._close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-delete-card": HuiDialogDeleteCard;
  }
}
