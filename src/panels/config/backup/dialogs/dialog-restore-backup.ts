import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-password-field";

import "../../../../components/ha-alert";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-svg-icon";
import {
  fetchBackupConfig,
  getPreferredAgentForDownload,
  restoreBackup,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { RestoreBackupDialogParams } from "./show-dialog-restore-backup";
import type {
  RestoreBackupStage,
  RestoreBackupState,
} from "../../../../data/backup_manager";
import { subscribeBackupEvents } from "../../../../data/backup_manager";

type FormData = {
  encryption_key_type: "config" | "custom";
  custom_encryption_key: string;
};

const INITIAL_DATA: FormData = {
  encryption_key_type: "config",
  custom_encryption_key: "",
};

const STEPS = ["confirm", "encryption", "progress"] as const;

@customElement("ha-dialog-restore-backup")
class DialogRestoreBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _step?: "confirm" | "encryption" | "progress";

  @state() private _params?: RestoreBackupDialogParams;

  @state() private _formData?: FormData;

  @state() private _backupEncryptionKey?: string;

  @state() private _userPassword?: string;

  @state() private _usedUserInput = false;

  @state() private _error?: string;

  @state() private _state?: RestoreBackupState;

  @state() private _stage?: RestoreBackupStage | null;

  @state() private _unsub?: Promise<UnsubscribeFunc>;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: RestoreBackupDialogParams) {
    this._params = params;

    this._formData = INITIAL_DATA;
    this._userPassword = undefined;
    this._usedUserInput = false;
    this._error = undefined;
    this._state = undefined;
    this._stage = undefined;
    if (this._params.backup.protected) {
      this._backupEncryptionKey = await this._fetchEncryptionKey();
      if (!this._backupEncryptionKey) {
        this._step = STEPS[1];
      } else {
        this._step = STEPS[0];
      }
    } else {
      this._step = STEPS[0];
    }
  }

  public closeDialog() {
    this._dialog?.close();
  }

  private _dialogClosed() {
    this._formData = undefined;
    this._params = undefined;
    this._backupEncryptionKey = undefined;
    this._userPassword = undefined;
    this._usedUserInput = false;
    this._error = undefined;
    this._state = undefined;
    this._stage = undefined;
    this._step = undefined;
    this._unsubscribe();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchEncryptionKey() {
    try {
      const { config } = await fetchBackupConfig(this.hass);
      return config.create_backup.password || undefined;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return undefined;
    }
  }

  protected render() {
    if (!this._step || !this._params || !this._formData) {
      return nothing;
    }

    const dialogTitle = this.hass.localize(
      "ui.panel.config.backup.dialogs.restore.title"
    );

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content" class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : this._step === "confirm"
              ? this._renderConfirm()
              : this._step === "encryption"
                ? this._renderEncryption()
                : this._renderProgress()}
        </div>
        <div slot="actions">
          ${this._error
            ? html`
                <ha-button @click=${this.closeDialog}>
                  ${this.hass.localize("ui.common.close")}
                </ha-button>
              `
            : this._step === "confirm" || this._step === "encryption"
              ? this._renderConfirmActions()
              : nothing}
        </div>
      </ha-md-dialog>
    `;
  }

  private _renderConfirm() {
    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.confirm.description"
        )}
      </p>
    `;
  }

  private _renderEncryptionIntro() {
    if (this._usedUserInput) {
      return html`
        ${this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.encryption.incorrect_key"
        )}
      `;
    }
    if (this._backupEncryptionKey) {
      return html`
        ${this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.encryption.different_key"
        )}
        ${this._params!.selectedData.homeassistant_included
          ? html`
              <ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.restore.encryption.warning"
                )}
              </ha-alert>
            `
          : nothing}
      `;
    }
    return html`
      ${this.hass.localize(
        "ui.panel.config.backup.dialogs.restore.encryption.description"
      )}
    `;
  }

  private _renderEncryption() {
    return html`
      ${this._renderEncryptionIntro()}

      <ha-password-field
        @input=${this._passwordChanged}
        .label=${this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.encryption.input_label"
        )}
        .value=${this._userPassword || ""}
      ></ha-password-field>
    `;
  }

  private _renderConfirmActions() {
    return html`
      <ha-button @click=${this.closeDialog}>
        ${this.hass.localize("ui.common.cancel")}
      </ha-button>
      <ha-button @click=${this._restoreBackup} class="destructive">
        ${this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.actions.restore"
        )}
      </ha-button>
    `;
  }

  private _renderProgress() {
    return html`<div class="centered">
      <ha-circular-progress indeterminate></ha-circular-progress>
      <p>
        ${this.hass.connected
          ? this._restoreState()
          : this.hass.localize(
              "ui.panel.config.backup.dialogs.restore.progress.restarting"
            )}
      </p>
    </div>`;
  }

  private _passwordChanged(ev): void {
    this._userPassword = ev.target.value;
  }

  private async _restoreBackup() {
    this._unsubscribe();
    this._state = undefined;
    this._stage = undefined;
    this._error = undefined;
    try {
      this._step = "progress";
      this._subscribeBackupEvents();
      await this._doRestoreBackup(
        this._userPassword || this._backupEncryptionKey
      );
    } catch (e: any) {
      await this._unsubscribe();
      if (e.code === "password_incorrect") {
        this._error = undefined;
        if (this._userPassword) {
          this._usedUserInput = true;
        }
        this._step = "encryption";
      } else {
        this._error = e.message;
      }
    }
  }

  private _subscribeBackupEvents() {
    this._unsub = subscribeBackupEvents(this.hass!, (event) => {
      if (event.manager_state === "idle" && this._state === "in_progress") {
        this.closeDialog();
      }
      if (event.manager_state !== "restore_backup") {
        return;
      }
      this._state = event.state;
      if (event.state === "completed") {
        this.closeDialog();
      }
      if (event.state === "failed") {
        this._error = this.hass.localize(
          "ui.panel.config.backup.dialogs.restore.restore_failed"
        );
      }
      if (event.state === "in_progress") {
        this._stage = event.stage;
      }
    });
  }

  private _unsubscribe() {
    if (this._unsub) {
      const prom = this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
      return prom;
    }
    return undefined;
  }

  private _restoreState() {
    if (!this._stage) {
      return this.hass.localize(
        "ui.panel.config.backup.dialogs.restore.progress.restoring"
      );
    }
    return this.hass.localize(
      `ui.panel.config.backup.overview.progress.description.restore_backup.${this._stage}`
    );
  }

  private async _doRestoreBackup(password?: string) {
    if (!this._params) {
      return;
    }

    const preferedAgent = getPreferredAgentForDownload(
      this._params.backup.agent_ids!
    );

    const { addons, database_included, homeassistant_included, folders } =
      this._params.selectedData;

    await restoreBackup(this.hass, {
      backup_id: this._params.backup.backup_id,
      agent_id: preferedAgent,
      password,
      restore_addons: addons.map((addon) => addon.slug),
      restore_database: database_included,
      restore_folders: folders,
      restore_homeassistant: homeassistant_included,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
          width: 100%;
        }
        .content p {
          margin: 0 0 16px;
        }
        .destructive {
          --mdc-theme-primary: var(--error-color);
        }
        .centered {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        ha-circular-progress {
          margin-bottom: 16px;
        }
        ha-alert[alert-type="warning"] {
          display: block;
          margin-top: 16px;
        }
        ha-password-field {
          display: block;
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-restore-backup": DialogRestoreBackup;
  }
}
