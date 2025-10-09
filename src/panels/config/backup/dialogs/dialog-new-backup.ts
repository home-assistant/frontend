import { mdiCalendarSync, mdiGestureTap } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-list";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-svg-icon";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { NewBackupDialogParams } from "./show-dialog-new-backup";

@customElement("ha-dialog-new-backup")
class DialogNewBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _params?: NewBackupDialogParams;

  public showDialog(params: NewBackupDialogParams): void {
    this._opened = true;
    this._params = params;
  }

  public closeDialog() {
    this._opened = false;
    return true;
  }

  private _dialogClosed() {
    if (this._params?.cancel) {
      this._params.cancel();
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened || !this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._opened}
        header-title=${this.hass.localize(
          "ui.panel.config.backup.dialogs.new.title"
        )}
        @closed=${this._dialogClosed}
      >
        <ha-md-list
          autofocus
          innerRole="listbox"
          itemRoles="option"
          .innerAriaLabel=${this.hass.localize(
            "ui.panel.config.backup.dialogs.new.options"
          )}
          rootTabbable
        >
          <ha-md-list-item
            @click=${this._automatic}
            type="button"
            .disabled=${!this._params.config.create_backup.password}
          >
            <ha-svg-icon slot="start" .path=${mdiCalendarSync}></ha-svg-icon>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.new.automatic.title"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.new.automatic.description"
              )}
            </span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>
          <ha-md-list-item @click=${this._manual} type="button">
            <ha-svg-icon slot="start" .path=${mdiGestureTap}></ha-svg-icon>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.new.manual.title"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.new.manual.description"
              )}
            </span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>
        </ha-md-list>
      </ha-wa-dialog>
    `;
  }

  private async _manual() {
    this._params!.submit?.("manual");
    this.closeDialog();
  }

  private async _automatic() {
    this._params!.submit?.("automatic");
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }

        ha-md-list {
          background: none;
        }
        ha-icon-next {
          width: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-backup": DialogNewBackup;
  }
}
