import deepFreeze from "deep-freeze";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./hui-card-preview";
import type { DeleteCardDialogParams } from "./show-delete-card-dialog";

@customElement("hui-dialog-delete-card")
export class HuiDialogDeleteCard extends LitElement {
  @property() protected hass!: HomeAssistant;

  @state() private _params?: DeleteCardDialogParams;

  @state() private _cardConfig?: LovelaceCardConfig;

  public async showDialog(params: DeleteCardDialogParams): Promise<void> {
    this._params = params;
    this._cardConfig = params.cardConfig;
    if (!Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._cardConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.panel.lovelace.cards.confirm_delete")}
      >
        <div>
          ${this._cardConfig
            ? html`
                <div class="element-preview">
                  <hui-card-preview
                    .hass=${this.hass}
                    .config=${this._cardConfig}
                  ></hui-card-preview>
                </div>
              `
            : ""}
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button slot="primaryAction" class="warning" @click=${this._delete}>
          ${this.hass!.localize("ui.common.delete")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
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

  private _delete(): void {
    if (!this._params?.deleteCard) {
      return;
    }
    this._params.deleteCard();
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-delete-card": HuiDialogDeleteCard;
  }
}
