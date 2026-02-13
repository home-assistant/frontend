import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-wa-dialog";
import type { HomeAssistant } from "../../types";
import type { UpdateBackupDialogParams } from "./show-update-backup-dialog";

@customElement("dialog-update-backup")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: UpdateBackupDialogParams;

  @state() private _open = false;

  @state() private _closeState?: "canceled" | "submitted";

  public async showDialog(params: UpdateBackupDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize("ui.dialogs.update_backup.title")}
        width="small"
        @closed=${this._dialogClosed}
      >
        <p>${this.hass.localize("ui.dialogs.update_backup.text")}</p>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._no}
          >
            ${this.hass!.localize("ui.common.no")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._yes}>
            ${this.hass.localize("ui.dialogs.update_backup.create")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _no(): void {
    this._closeState = "submitted";
    if (this._params!.submit) {
      this._params!.submit(false);
    }
    this.closeDialog();
  }

  private _yes(): void {
    this._closeState = "submitted";
    if (this._params!.submit) {
      this._params!.submit(true);
    }
    this.closeDialog();
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    if (!this._closeState) {
      this._params?.cancel?.();
    }
    this._closeState = undefined;
    this._params = undefined;
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static styles = css`
    p {
      margin: 0;
      color: var(--primary-text-color);
    }
    ha-wa-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-update-backup": DialogBox;
  }
}
