import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-wa-dialog";
import "../../components/ha-spinner";
import {
  subscribeBackupEvents,
  type ManagerState,
} from "../../data/backup_manager";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { RestartWaitDialogParams } from "./show-dialog-restart";

@customElement("dialog-restart-wait")
class DialogRestartWait extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state()
  private _title = "";

  private _actionOnIdle?: () => Promise<void>;

  @state()
  private _error?: string;

  @state()
  private _backupState?: ManagerState;

  private _backupEventsSubscription?: Promise<UnsubscribeFunc>;

  public async showDialog(params: RestartWaitDialogParams): Promise<void> {
    this._open = true;
    this._loadBackupState();

    this._title = params.title;
    this._backupState = params.initialBackupState;

    this._actionOnIdle = params.action;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    if (this._backupEventsSubscription) {
      this._backupEventsSubscription.then((unsub) => {
        unsub();
      });
      this._backupEventsSubscription = undefined;
    }

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _getWaitMessage() {
    switch (this._backupState) {
      case "create_backup":
        return this.hass.localize("ui.dialogs.restart.wait_for_backup");
      case "receive_backup":
        return this.hass.localize("ui.dialogs.restart.wait_for_upload");
      case "restore_backup":
        return this.hass.localize("ui.dialogs.restart.wait_for_restore");
      default:
        return "";
    }
  }

  protected render() {
    const waitMessage = this._getWaitMessage();

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this._title}
        width="medium"
        @closed=${this._dialogClosed}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error"
                >${this.hass.localize("ui.dialogs.restart.error_backup_state", {
                  error: this._error,
                })}</ha-alert
              > `
            : html`
                <ha-spinner></ha-spinner>
                ${waitMessage}
              `}
        </div>
      </ha-wa-dialog>
    `;
  }

  private async _loadBackupState() {
    try {
      this._backupEventsSubscription = subscribeBackupEvents(
        this.hass,
        async (event) => {
          this._backupState = event.manager_state;
          if (this._backupState === "idle") {
            this.closeDialog();
            await this._actionOnIdle?.();
          }
        }
      );
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          gap: 32px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-restart-wait": DialogRestartWait;
  }
}
