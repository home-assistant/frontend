import { mdiClose } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-spinner";
import { fetchBackupInfo } from "../../data/backup";
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
  private _backupState?: ManagerState;

  private _backupEventsSubscription?: UnsubscribeFunc;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: RestartWaitDialogParams): Promise<void> {
    this._open = true;
    this._loadBackupState();

    this._title = params.title;
    this._backupState = params.initialBackupState;

    this._actionOnIdle = params.action;
  }

  private _dialogClosed(): void {
    this._open = false;

    if (this._backupEventsSubscription) {
      this._backupEventsSubscription();
      this._backupEventsSubscription = undefined;
    }

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    this._dialog?.close();
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
    if (!this._open) {
      return nothing;
    }

    const waitMessage = this._getWaitMessage();

    return html`
      <ha-md-dialog
        open
        @closed=${this._dialogClosed}
        .disableCancelAction=${true}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.cancel")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${this._title}> ${this._title} </span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <ha-spinner></ha-spinner>
          ${waitMessage}
        </div>
      </ha-md-dialog>
    `;
  }

  private async _loadBackupState() {
    try {
      const { state: backupState } = await fetchBackupInfo(this.hass);
      this._backupState = backupState;

      if (this._backupState === "idle") {
        this.closeDialog();
        await this._actionOnIdle?.();
        return;
      }

      this._backupEventsSubscription = await subscribeBackupEvents(
        this.hass,
        async (event) => {
          this._backupState = event.manager_state;
          if (this._backupState === "idle") {
            this.closeDialog();
            await this._actionOnIdle?.();
          }
        }
      );
    } catch (err) {
      // TODO show error to user
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          --dialog-content-padding: 0;
        }
        @media all and (min-width: 550px) {
          ha-md-dialog {
            min-width: 500px;
            max-width: 500px;
          }
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
