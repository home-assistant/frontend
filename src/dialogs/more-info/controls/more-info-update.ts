import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { BINARY_STATE_OFF } from "../../../common/const";
import { relativeTime } from "../../../common/datetime/relative_time";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-checkbox";
import "../../../components/ha-faded";
import "../../../components/ha-markdown";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-switch";
import type { BackupConfig } from "../../../data/backup";
import { fetchBackupConfig } from "../../../data/backup";
import { isUnavailableState } from "../../../data/entity";
import type { EntitySources } from "../../../data/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity_sources";
import { getSupervisorUpdateConfig } from "../../../data/supervisor/update";
import type { UpdateEntity, UpdateType } from "../../../data/update";
import {
  getUpdateType,
  UpdateEntityFeature,
  updateIsInstalling,
  updateReleaseNotes,
} from "../../../data/update";
import type { HomeAssistant } from "../../../types";
import { showAlertDialog } from "../../generic/show-dialog-box";

@customElement("more-info-update")
class MoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state() private _releaseNotes?: string | null;

  @state() private _error?: string;

  @state() private _markdownLoading = true;

  @state() private _backupConfig?: BackupConfig;

  @state() private _createBackup = false;

  @state() private _entitySources?: EntitySources;

  private async _fetchBackupConfig() {
    try {
      const { config } = await fetchBackupConfig(this.hass);
      this._backupConfig = config;
    } catch (err) {
      // ignore error, because user will get a manual backup option
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private async _fetchUpdateBackupConfig(type: UpdateType) {
    try {
      const config = await getSupervisorUpdateConfig(this.hass);

      // for home assistant and OS updates
      if (this._isHaOrOsUpdate(type)) {
        this._createBackup = config.core_backup_before_update;
        return;
      }

      if (type === "addon") {
        this._createBackup = config.add_on_backup_before_update;
      }
    } catch (err) {
      // ignore error, because user can still set the config
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private async _fetchEntitySources() {
    this._entitySources = await fetchEntitySourcesWithCache(this.hass);
  }

  private _isHaOrOsUpdate(type: UpdateType): boolean {
    return ["home_assistant", "home_assistant_os"].includes(type);
  }

  private _isVersionSkipped(): boolean {
    if (!this.stateObj) {
      return false;
    }

    return !!(
      this.stateObj.attributes.latest_version &&
      this.stateObj.attributes.skipped_version ===
        this.stateObj.attributes.latest_version
    );
  }

  private _isUpdateButtonDisabled(): boolean {
    if (!this.stateObj) {
      return true;
    }

    return (
      (this.stateObj.state === BINARY_STATE_OFF && !this._isVersionSkipped()) ||
      updateIsInstalling(this.stateObj)
    );
  }

  private _computeCreateBackupTexts():
    | { title: string; description?: string }
    | undefined {
    if (
      !this.stateObj ||
      !supportsFeature(this.stateObj, UpdateEntityFeature.BACKUP)
    ) {
      return undefined;
    }

    const updateType = this._entitySources
      ? getUpdateType(this.stateObj, this._entitySources)
      : "generic";

    if (this._isHaOrOsUpdate(updateType)) {
      const isBackupConfigValid =
        !!this._backupConfig &&
        !!this._backupConfig.automatic_backups_configured &&
        !!this._backupConfig.create_backup.password &&
        this._backupConfig.create_backup.agent_ids.length > 0;

      if (!isBackupConfigValid) {
        return {
          title: this.hass.localize(
            "ui.dialogs.more_info_control.update.create_backup.manual"
          ),
          description: this.hass.localize(
            "ui.dialogs.more_info_control.update.create_backup.manual_description"
          ),
        };
      }

      const lastAutomaticBackupDate = this._backupConfig
        ?.last_completed_automatic_backup
        ? new Date(this._backupConfig?.last_completed_automatic_backup)
        : null;
      const now = new Date();

      return {
        title: this.hass.localize(
          "ui.dialogs.more_info_control.update.create_backup.automatic"
        ),
        description: lastAutomaticBackupDate
          ? this.hass.localize(
              "ui.dialogs.more_info_control.update.create_backup.automatic_description_last",
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
              "ui.dialogs.more_info_control.update.create_backup.automatic_description_none"
            ),
      };
    }

    // Addon backup
    if (updateType === "addon") {
      const version = this.stateObj.attributes.installed_version;
      return {
        title: this.hass.localize(
          "ui.dialogs.more_info_control.update.create_backup.addon"
        ),
        description: version
          ? this.hass.localize(
              "ui.dialogs.more_info_control.update.create_backup.addon_description",
              { version: version }
            )
          : undefined,
      };
    }

    // Fallback to generic UI
    return {
      title: this.hass.localize(
        "ui.dialogs.more_info_control.update.create_backup.generic"
      ),
    };
  }

  protected render() {
    if (
      !this.hass ||
      !this.stateObj ||
      isUnavailableState(this.stateObj.state)
    ) {
      return nothing;
    }

    const createBackupTexts = this._computeCreateBackupTexts();

    return html`
      <div class="content">
        <div class="summary">
          ${this.stateObj.attributes.in_progress
            ? supportsFeature(this.stateObj, UpdateEntityFeature.PROGRESS) &&
              this.stateObj.attributes.update_percentage !== null
              ? html`<mwc-linear-progress
                  .progress=${this.stateObj.attributes.update_percentage / 100}
                  buffer=""
                ></mwc-linear-progress>`
              : html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
            : nothing}
          <h3>${this.stateObj.attributes.title}</h3>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          <div class="row">
            <div class="key">
              ${this.hass.formatEntityAttributeName(
                this.stateObj,
                "installed_version"
              )}
            </div>
            <div class="value">
              ${this.stateObj.attributes.installed_version ??
              this.hass.localize("state.default.unavailable")}
            </div>
          </div>
          <div class="row">
            <div class="key">
              ${this.hass.formatEntityAttributeName(
                this.stateObj,
                "latest_version"
              )}
            </div>
            <div class="value">
              ${this.stateObj.attributes.latest_version ??
              this.hass.localize("state.default.unavailable")}
            </div>
          </div>

          ${this.stateObj.attributes.release_url
            ? html`<div class="row">
                <div class="key">
                  <a
                    href=${this.stateObj.attributes.release_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ${this.hass.localize(
                      "ui.dialogs.more_info_control.update.release_announcement"
                    )}
                  </a>
                </div>
              </div>`
            : nothing}
        </div>
        ${supportsFeature(this.stateObj!, UpdateEntityFeature.RELEASE_NOTES) &&
        !this._error
          ? this._releaseNotes === undefined
            ? html`
                <hr />
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
            : html`
                <hr />
                <ha-markdown
                  @content-resize=${this._markdownLoaded}
                  .content=${this._releaseNotes}
                  class=${this._markdownLoading ? "hidden" : ""}
                ></ha-markdown>
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
          : this.stateObj.attributes.release_summary
            ? html`
                <hr />
                <ha-markdown
                  @content-resize=${this._markdownLoaded}
                  .content=${this.stateObj.attributes.release_summary}
                  class=${this._markdownLoading ? "hidden" : ""}
                ></ha-markdown>
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
            : nothing}
      </div>
      <div class="footer">
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
                    .disabled=${updateIsInstalling(this.stateObj)}
                  ></ha-switch>
                </ha-md-list-item>
              </ha-md-list>
            `
          : nothing}
        <div class="actions">
          ${this.stateObj.state === BINARY_STATE_OFF &&
          this.stateObj.attributes.skipped_version
            ? html`
                <ha-button @click=${this._handleClearSkipped}>
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.clear_skipped"
                  )}
                </ha-button>
              `
            : html`
                <ha-button
                  @click=${this._handleSkip}
                  .disabled=${this._isVersionSkipped() ||
                  this.stateObj.state === BINARY_STATE_OFF ||
                  updateIsInstalling(this.stateObj)}
                >
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.skip"
                  )}
                </ha-button>
              `}
          ${supportsFeature(this.stateObj, UpdateEntityFeature.INSTALL)
            ? html`
                <ha-progress-button
                  @click=${this._handleInstall}
                  .progress=${updateIsInstalling(this.stateObj)}
                  .disabled=${this._isUpdateButtonDisabled()}
                >
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.update"
                  )}
                </ha-progress-button>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderLoader() {
    return html`
      <div class="flex center loader">
        <ha-spinner></ha-spinner>
      </div>
    `;
  }

  protected firstUpdated(): void {
    if (supportsFeature(this.stateObj!, UpdateEntityFeature.RELEASE_NOTES)) {
      this._fetchReleaseNotes();
    }
    if (supportsFeature(this.stateObj!, UpdateEntityFeature.BACKUP)) {
      this._fetchEntitySources().then(() => {
        const type = getUpdateType(this.stateObj!, this._entitySources!);
        if (
          isComponentLoaded(this.hass, "hassio") &&
          ["addon", "home_assistant", "home_assistant_os"].includes(type)
        ) {
          this._fetchUpdateBackupConfig(type);
        }

        if (this._isHaOrOsUpdate(type)) {
          this._fetchBackupConfig();
        }
      });
    }
  }

  private async _markdownLoaded() {
    if (this._markdownLoading) {
      this._markdownLoading = false;
    }
  }

  private async _fetchReleaseNotes() {
    try {
      this._releaseNotes = await updateReleaseNotes(
        this.hass,
        this.stateObj!.entity_id
      );
    } catch (err: any) {
      this._error = err.message;
    }
  }

  get _shouldCreateBackup(): boolean {
    if (!supportsFeature(this.stateObj!, UpdateEntityFeature.BACKUP)) {
      return false;
    }
    return this._createBackup;
  }

  private _handleInstall(): void {
    if (this._isUpdateButtonDisabled()) {
      return;
    }

    const installData: Record<string, any> = {
      entity_id: this.stateObj!.entity_id,
    };

    if (this._shouldCreateBackup) {
      installData.backup = true;
    }

    if (
      supportsFeature(this.stateObj!, UpdateEntityFeature.SPECIFIC_VERSION) &&
      this.stateObj!.attributes.latest_version
    ) {
      installData.version = this.stateObj!.attributes.latest_version;
    }

    this.hass.callService("update", "install", installData);
  }

  private _createBackupChanged(ev) {
    this._createBackup = ev.target.checked;
  }

  private _handleSkip(): void {
    if (this.stateObj!.attributes.auto_update) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_title"
        ),
        text: this.hass.localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_text"
        ),
      });
      return;
    }
    this.hass.callService("update", "skip", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _handleClearSkipped(): void {
    this.hass.callService("update", "clear_skipped", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }
    hr {
      border-color: var(--divider-color);
      border-bottom: none;
      margin: 16px 0;
    }
    ha-expansion-panel {
      margin: 16px 0;
    }

    .summary {
      margin-bottom: 16px;
    }

    .row {
      margin: 0;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    .footer {
      border-top: 1px solid var(--divider-color);
      background: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      position: sticky;
      bottom: 0;
      margin: 0 -24px 0 -24px;
      margin-bottom: calc(-1 * max(var(--safe-area-inset-bottom), 24px));
      padding-bottom: var(--safe-area-inset-bottom);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
      z-index: 10;
    }

    ha-md-list {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: -16px;
      margin-top: -4px;
      --md-sys-color-surface: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
    }

    ha-md-list-item {
      --md-list-item-leading-space: 24px;
      --md-list-item-trailing-space: 24px;
    }

    .actions {
      width: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      box-sizing: border-box;
      padding: 12px;
      z-index: 1;
      gap: 8px;
    }

    a {
      color: var(--primary-color);
    }
    .flex.center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    mwc-linear-progress {
      margin-bottom: -8px;
      margin-top: 4px;
    }
    ha-markdown {
      direction: ltr;
      padding-bottom: 16px;
      box-sizing: border-box;
    }
    ha-markdown.hidden {
      display: none;
    }
    .loader {
      height: 80px;
      box-sizing: border-box;
      padding-bottom: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-update": MoreInfoUpdate;
  }
}
