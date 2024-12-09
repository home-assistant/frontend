import { mdiClose, mdiDownload, mdiKey } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-password-field";
import "../../../../components/ha-svg-icon";
import type {
  BackupConfig,
  BackupMutableConfig,
} from "../../../../data/backup";
import {
  BackupScheduleState,
  generateEncryptionKey,
  updateBackupConfig,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { fileDownload } from "../../../../util/file_download";
import { showToast } from "../../../../util/toast";
import "../components/ha-backup-config-agents";
import "../components/ha-backup-config-data";
import type { BackupConfigData } from "../components/ha-backup-config-data";
import "../components/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "../components/ha-backup-config-schedule";
import type { SetBackupEncryptionKeyDialogParams } from "./show-dialog-set-backup-encryption-key";

const STEPS = [
  "welcome",
  "new_key",
  "save_key",
  "schedule",
  "data",
  "locations",
] as const;

type Step = (typeof STEPS)[number];

const INITIAL_CONFIG: BackupConfig = {
  create_backup: {
    agent_ids: [],
    include_addons: null,
    include_all_addons: true,
    include_database: true,
    include_folders: null,
    name: null,
    password: null,
  },
  retention: {
    copies: 3,
    days: null,
  },
  schedule: {
    state: BackupScheduleState.DAILY,
  },
  last_automatic_backup: null,
};

@customElement("ha-dialog-backup-onboarding")
class DialogSetBackupEncryptionKey extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _step?: Step;

  @state() private _params?: SetBackupEncryptionKeyDialogParams;

  @query("ha-md-dialog") private _dialog!: HaMdDialog;

  @state() private _config?: BackupConfig;

  private _suggestedEncryptionKey?: string;

  public showDialog(params: SetBackupEncryptionKeyDialogParams): void {
    this._params = params;
    this._step = STEPS[0];
    this._config = INITIAL_CONFIG;
    this._opened = true;
    this._suggestedEncryptionKey = generateEncryptionKey();
  }

  public closeDialog(): void {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._step = undefined;
    this._config = undefined;
    this._params = undefined;
    this._suggestedEncryptionKey = undefined;
  }

  private async _done() {
    if (!this._config) {
      return;
    }

    const params: BackupMutableConfig = {
      create_backup: {
        password: this._config.create_backup.password,
        include_database: this._config.create_backup.include_database,
        agent_ids: this._config.create_backup.agent_ids,
      },
      schedule: this._config.schedule.state,
      retention: this._config.retention,
    };

    if (isComponentLoaded(this.hass, "hassio")) {
      params.create_backup!.include_folders =
        this._config.create_backup.include_folders || [];
      params.create_backup!.include_all_addons =
        this._config.create_backup.include_all_addons;
      params.create_backup!.include_addons =
        this._config.create_backup.include_addons || [];
    }

    try {
      await updateBackupConfig(this.hass, params);

      this._params?.submit!(true);
      this._dialog.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      showToast(this, { message: "Failed to save backup configuration" });
    }
  }

  private _previousStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === 0) {
      return;
    }
    this._step = STEPS[index - 1];
  }

  private _nextStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === STEPS.length - 1) {
      return;
    }
    this._step = STEPS[index + 1];
  }

  protected render() {
    if (!this._opened || !this._params) {
      return nothing;
    }

    const isLastStep = this._step === STEPS[STEPS.length - 1];
    const isFirstStep = this._step === STEPS[0];

    return html`
      <ha-md-dialog disable-cancel-action open @closed=${this.closeDialog}>
        <ha-dialog-header slot="headline">
          ${isFirstStep
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.dialogs.generic.close")}
                  .path=${mdiClose}
                  @click=${this.closeDialog}
                ></ha-icon-button>
              `
            : html`
                <ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._previousStep}
                ></ha-icon-button-prev>
              `}

          <span slot="title">${this._stepTitle}</span>
        </ha-dialog-header>
        <div slot="content">${this._renderStepContent()}</div>
        <div slot="actions">
          ${isLastStep
            ? html`
                <ha-button
                  @click=${this._done}
                  .disabled=${!this._isStepValid()}
                >
                  Save
                </ha-button>
              `
            : html`
                <ha-button
                  @click=${this._nextStep}
                  .disabled=${!this._isStepValid()}
                >
                  Next
                </ha-button>
              `}
        </div>
      </ha-md-dialog>
    `;
  }

  private get _stepTitle(): string {
    switch (this._step) {
      case "welcome":
        return "Set up your backup strategy";
      case "new_key":
        return "Encryption key";
      case "save_key":
        return "Save encryption key";
      case "schedule":
        return "Automatic backups";
      case "data":
        return "Backup data";
      case "locations":
        return "Locations";
      default:
        return "";
    }
  }

  private _isStepValid(): boolean {
    switch (this._step) {
      case "new_key":
        return !!this._config?.create_backup.password;
      case "save_key":
        return true;
      case "schedule":
        return !!this._config?.schedule;
      case "data":
        return !!this._config?.schedule;
      case "locations":
        return !!this._config?.create_backup.agent_ids.length;
      default:
        return true;
    }
  }

  private _renderStepContent() {
    if (!this._config) {
      return nothing;
    }

    switch (this._step) {
      case "welcome":
        return html`
          <p>
            Backups are essential to a reliable smart home. They protect your
            setup against failures and allows you to quickly have a working
            system again. It is recommended to create a daily backup and keep
            copies of the last 3 days on two different locations. And one of
            them is off-site.
          </p>
        `;
      case "new_key":
        return html`
          <p>
            All your backups are encrypted to keep your data private and secure.
            You need this encryption key to restore any backup.
          </p>
          <ha-password-field
            placeholder="New encryption key"
            @input=${this._encryptionKeyChanged}
            .value=${this._config.create_backup.password ?? ""}
          ></ha-password-field>
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiKey}></ha-svg-icon>
              <span slot="headline">Use suggested encryption key</span>
              <span slot="supporting-text">
                ${this._suggestedEncryptionKey}
              </span>
              <ha-button slot="end" @click=${this._useSuggestedEncryptionKey}>
                Enter
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "save_key":
        return html`
          <p>
            It’s important that you don’t lose this encryption key. We recommend
            to save this key somewhere secure. As you can only restore your data
            with the backup encryption key.
          </p>
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline">Download emergency kit</span>
              <span slot="supporting-text">
                We recommend to save this encryption key somewhere secure.
              </span>
              <ha-button slot="end" @click=${this._downloadKey}>
                <ha-svg-icon .path=${mdiDownload} slot="icon"></ha-svg-icon>
                Download
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "schedule":
        return html`
          <p>
            Let Home Assistant take care of your backups by creating a scheduled
            backup that also removes older copies.
          </p>
          <ha-backup-config-schedule
            .hass=${this.hass}
            .value=${this._config}
            @value-changed=${this._scheduleChanged}
          ></ha-backup-config-schedule>
        `;
      case "data":
        return html`
          <p>
            Choose what data to include in your backups. You can always change
            this later.
          </p>
          <ha-backup-config-data
            .hass=${this.hass}
            .value=${this._dataConfig(this._config)}
            @value-changed=${this._dataChanged}
            force-home-assistant
          ></ha-backup-config-data>
        `;
      case "locations":
        return html`
          <p>
            Home Assistant will upload to these locations when this backup
            strategy is used. You can use all locations for custom backups.
          </p>
          <ha-backup-config-agents
            .hass=${this.hass}
            .value=${this._config.create_backup.agent_ids}
            @value-changed=${this._agentsConfigChanged}
          ></ha-backup-config-agents>
        `;
    }
    return nothing;
  }

  private _downloadKey() {
    const key = this._config?.create_backup.password;
    if (!key) {
      return;
    }
    fileDownload(
      "data:text/plain;charset=utf-8," + encodeURIComponent(key),
      "emergency_kit.txt"
    );
  }

  private _encryptionKeyChanged(ev) {
    const value = ev.target.value;
    this._setEncryptionKey(value);
  }

  private _useSuggestedEncryptionKey() {
    this._setEncryptionKey(this._suggestedEncryptionKey!);
  }

  private _setEncryptionKey(value: string) {
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        password: value,
      },
    };
  }

  private _dataConfig(config: BackupConfig): BackupConfigData {
    const {
      include_addons,
      include_all_addons,
      include_database,
      include_folders,
    } = config.create_backup;

    return {
      include_homeassistant: true,
      include_database,
      include_folders: include_folders || undefined,
      include_all_addons,
      include_addons: include_addons || undefined,
    };
  }

  private _dataChanged(ev) {
    const data = ev.detail.value as BackupConfigData;
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        include_database: data.include_database,
        include_folders: data.include_folders || null,
        include_all_addons: data.include_all_addons,
        include_addons: data.include_addons || null,
      },
    };
  }

  private _scheduleChanged(ev) {
    const value = ev.detail.value as BackupConfigSchedule;
    this._config = {
      ...this._config!,
      schedule: value.schedule,
      retention: value.retention,
    };
  }

  private _agentsConfigChanged(ev) {
    const agents = ev.detail.value as string[];
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        agent_ids: agents,
      },
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          width: 90vw;
          max-width: 500px;
        }
        div[slot="content"] {
          margin-top: -16px;
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-md-dialog {
            max-width: none;
          }
          div[slot="content"] {
            margin-top: 0;
          }
        }
        p {
          margin-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-backup-onboarding": DialogSetBackupEncryptionKey;
  }
}
