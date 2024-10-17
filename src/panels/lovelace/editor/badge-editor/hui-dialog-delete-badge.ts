import deepFreeze from "deep-freeze";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../badges/hui-badge";
import type { DeleteBadgeDialogParams } from "./show-delete-badge-dialog";

@customElement("hui-dialog-delete-badge")
export class HuiDialogDeleteBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DeleteBadgeDialogParams;

  @state() private _badgeConfig?: LovelaceBadgeConfig;

  public async showDialog(params: DeleteBadgeDialogParams): Promise<void> {
    this._params = params;
    this._badgeConfig = params.badgeConfig;
    if (!Object.isFrozen(this._badgeConfig)) {
      this._badgeConfig = deepFreeze(this._badgeConfig);
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._badgeConfig = undefined;
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
        .heading=${this.hass.localize(
          "ui.panel.lovelace.badges.confirm_delete"
        )}
      >
        <div>
          ${this._badgeConfig
            ? html`
                <div class="element-preview">
                  <hui-badge
                    .hass=${this.hass}
                    .config=${this._badgeConfig}
                    preview
                  ></hui-badge>
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
          max-width: 500px;
          display: block;
          width: 100%;
          display: flex;
        }
        hui-badge {
          margin: 4px auto;
        }
      `,
    ];
  }

  private _delete(): void {
    if (!this._params?.deleteBadge) {
      return;
    }
    this._params.deleteBadge();
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-delete-badge": HuiDialogDeleteBadge;
  }
}
