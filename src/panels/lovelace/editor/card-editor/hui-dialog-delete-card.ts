import deepFreeze from "deep-freeze";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../cards/hui-card";
import "../../../../components/ha-button";
import type { DeleteCardDialogParams } from "./show-delete-card-dialog";

@customElement("hui-dialog-delete-card")
export class HuiDialogDeleteCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
                  <hui-card
                    .hass=${this.hass}
                    .config=${this._cardConfig}
                    preview
                  ></hui-card>
                </div>
              `
            : ""}
        </div>
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button slot="primaryAction" class="warning" @click=${this._delete}>
          ${this.hass!.localize("ui.common.delete")}
        </ha-button>
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
        hui-card {
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
