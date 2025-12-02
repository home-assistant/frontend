import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import "../../../components/ha-md-dialog";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-switch";
import type { BackupConfig } from "../../../data/backup";
import { fetchBackupConfig } from "../../../data/backup";
import { getSupervisorUpdateConfig } from "../../../data/supervisor/update";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../types";
import type { LabsPreviewFeatureEnableDialogParams } from "./show-dialog-labs-preview-feature-enable";

@customElement("dialog-labs-preview-feature-enable")
export class DialogLabsPreviewFeatureEnable
  extends LitElement
  implements HassDialog<LabsPreviewFeatureEnableDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LabsPreviewFeatureEnableDialogParams;

  @state() private _backupConfig?: BackupConfig;

  @state() private _createBackup = false;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(
    params: LabsPreviewFeatureEnableDialogParams
  ): Promise<void> {
    this._params = params;
    this._createBackup = false;
    this._fetchBackupConfig();
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchUpdateBackupConfig();
    }
  }

  public closeDialog(): boolean {
    this._dialog?.close();
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._backupConfig = undefined;
    this._createBackup = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchBackupConfig() {
    try {
      const { config } = await fetchBackupConfig(this.hass);
      this._backupConfig = config;
    } catch (err) {
      // Ignore error, user will get manual backup option
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private async _fetchUpdateBackupConfig() {
    try {
      const config = await getSupervisorUpdateConfig(this.hass);
      this._createBackup = config.core_backup_before_update;
    } catch (err) {
      // Ignore error, user can still toggle the switch manually
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private _computeCreateBackupTexts():
    | { title: string; description?: string }
    | undefined {
    if (
      !this._backupConfig ||
      !this._backupConfig.automatic_backups_configured ||
      !this._backupConfig.create_backup.password ||
      this._backupConfig.create_backup.agent_ids.length === 0
    ) {
      return {
        title: this.hass.localize("ui.panel.config.labs.create_backup.manual"),
        description: this.hass.localize(
          "ui.panel.config.labs.create_backup.manual_description"
        ),
      };
    }

    const lastAutomaticBackupDate = this._backupConfig
      .last_completed_automatic_backup
      ? new Date(this._backupConfig.last_completed_automatic_backup)
      : null;
    const now = new Date();

    return {
      title: this.hass.localize("ui.panel.config.labs.create_backup.automatic"),
      description: lastAutomaticBackupDate
        ? this.hass.localize(
            "ui.panel.config.labs.create_backup.automatic_description_last",
            {
              relative_time: relativeTime(
                lastAutomaticBackupDate,
                this.hass.locale,
                now,
                true
              ),
            }
          )
        : this.hass.localize(
            "ui.panel.config.labs.create_backup.automatic_description_none"
          ),
    };
  }

  private _createBackupChanged(ev: Event): void {
    this._createBackup = (ev.target as HaSwitch).checked;
  }

  private _handleCancel(): void {
    this.closeDialog();
  }

  private _handleConfirm(): void {
    if (this._params) {
      this._params.onConfirm(this._createBackup);
    }
    this.closeDialog();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const createBackupTexts = this._computeCreateBackupTexts();

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <span slot="headline">
          ${this.hass.localize("ui.panel.config.labs.enable_title")}
        </span>
        <div slot="content">
          <p>
            ${this.hass.localize(
              `component.${this._params.preview_feature.domain}.preview_features.${this._params.preview_feature.preview_feature}.enable_confirmation`
            ) || this.hass.localize("ui.panel.config.labs.enable_confirmation")}
          </p>
        </div>
        <div slot="actions">
          ${createBackupTexts
            ? html`
                <ha-md-list>
                  <ha-md-list-item>
                    <span slot="headline">${createBackupTexts.title}</span>
                    ${createBackupTexts.description
                      ? html`
                          <span slot="supporting-text">
                            ${createBackupTexts.description}
                          </span>
                        `
                      : nothing}
                    <ha-switch
                      slot="end"
                      .checked=${this._createBackup}
                      @change=${this._createBackupChanged}
                    ></ha-switch>
                  </ha-md-list-item>
                </ha-md-list>
              `
            : nothing}
          <div>
            <ha-button appearance="plain" @click=${this._handleCancel}>
              ${this.hass.localize("ui.common.cancel")}
            </ha-button>
            <ha-button
              appearance="filled"
              variant="brand"
              @click=${this._handleConfirm}
            >
              ${this.hass.localize("ui.panel.config.labs.enable")}
            </ha-button>
          </div>
        </div>
      </ha-md-dialog>
    `;
  }

  static readonly styles = css`
    ha-md-dialog {
      --dialog-content-padding: var(--ha-space-6);
    }

    p {
      margin: 0;
      color: var(--secondary-text-color);
    }

    div[slot="actions"] {
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    ha-md-list {
      background: none;
      --md-list-item-leading-space: var(--ha-space-6);
      --md-list-item-trailing-space: var(--ha-space-6);
      margin: 0;
      padding: 0;
      border-top: var(--ha-border-width-sm) solid var(--divider-color);
    }

    div[slot="actions"] > div {
      display: flex;
      justify-content: flex-end;
      gap: var(--ha-space-2);
      padding: var(--ha-space-4) var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-labs-preview-feature-enable": DialogLabsPreviewFeatureEnable;
  }
}
