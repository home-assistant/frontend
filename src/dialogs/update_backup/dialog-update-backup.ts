import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import { createCloseHeading } from "../../components/ha-dialog";
import type { HomeAssistant } from "../../types";
import type { UpdateBackupDialogParams } from "./show-update-backup-dialog";

@customElement("dialog-update-backup")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: UpdateBackupDialogParams;

  public async showDialog(params: UpdateBackupDialogParams): Promise<void> {
    this._params = params;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this._cancel}
        defaultAction="ignore"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.update_backup.title")
        )}
      >
        <p>${this.hass.localize("ui.dialogs.update_backup.text")}</p>
        <ha-button appearance="plain" @click=${this._no} slot="secondaryAction">
          ${this.hass!.localize("ui.common.no")}
        </ha-button>
        <ha-button @click=${this._yes} slot="primaryAction">
          ${this.hass.localize("ui.dialogs.update_backup.create")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _no(): void {
    if (this._params!.submit) {
      this._params!.submit(false);
    }
    this.closeDialog();
  }

  private _yes(): void {
    if (this._params!.submit) {
      this._params!.submit(true);
    }
    this.closeDialog();
  }

  private _cancel(): void {
    this._params?.cancel?.();
    this.closeDialog();
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static styles = css`
    p {
      margin: 0;
      color: var(--primary-text-color);
    }
    ha-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
    }
    @media all and (min-width: 600px) {
      ha-dialog {
        --mdc-dialog-min-width: 400px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-update-backup": DialogBox;
  }
}
