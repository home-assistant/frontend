import type { ActionDetail } from "@material/mwc-list";
import { mdiDelete, mdiDotsVertical, mdiDownload } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import { getSignedPath } from "../../../data/auth";
import type { BackupContentExtended } from "../../../data/backup";
import {
  deleteBackup,
  fetchBackupDetails,
  getBackupDownloadUrl,
  getPreferredAgentForDownload,
  restoreBackup,
} from "../../../data/backup";
import type { HassioAddonInfo } from "../../../data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { bytesToString } from "../../../util/bytes-to-string";
import { fileDownload } from "../../../util/file_download";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../lovelace/custom-card-helpers";
import "./components/ha-backup-data-picker";

@customElement("ha-config-backup-details")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "backup-id" }) public backupId!: string;

  @state() private _backup?: BackupContentExtended | null;

  @state() private _error?: string;

  @state() private _selectedBackup?: BackupContentExtended;

  @state() private _addonsInfo?: HassioAddonInfo[];

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddonInfo();
    }

    if (this.backupId) {
      this._fetchBackup();
    } else {
      this._error = "Backup id not defined";
    }
  }

  private async _fetchAddonInfo() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addonsInfo = addons;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this._backup?.name || "Backup"}
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-list-item graphic="icon">
            <ha-svg-icon slot="graphic" .path=${mdiDownload}></ha-svg-icon>
            ${this.hass.localize("ui.common.download")}
          </ha-list-item>
          <ha-list-item graphic="icon" class="warning">
            <ha-svg-icon slot="graphic" .path=${mdiDelete}></ha-svg-icon>
            ${this.hass.localize("ui.common.delete")}
          </ha-list-item>
        </ha-button-menu>
        <div class="content">
          ${this._error &&
          html`<ha-alert alert-type="error">${this._error}</ha-alert>`}
          ${this._backup === null
            ? html`<ha-alert alert-type="warning" title="Not found">
                Backup matching ${this.backupId} not found
              </ha-alert>`
            : !this._backup
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : html`
                  <ha-card header="Select what to restore">
                    <div class="card-content">
                      <ha-backup-data-picker
                        .hass=${this.hass}
                        .data=${this._backup}
                        .value=${this._selectedBackup}
                        @value-changed=${this._selectedBackupChanged}
                        .addonsInfo=${this._addonsInfo}
                      >
                      </ha-backup-data-picker>
                    </div>
                    <div class="card-actions">
                      <ha-button
                        @click=${this._restore}
                        .disabled=${this._isRestoreDisabled()}
                      >
                        Restore
                      </ha-button>
                    </div>
                  </ha-card>
                  <ha-card header="Backup">
                    <div class="card-content">
                      <ha-md-list>
                        <ha-md-list-item>
                          <span slot="headline">
                            ${bytesToString(this._backup.size)}
                          </span>
                          <span slot="supporting-text">Size</span>
                        </ha-md-list-item>
                        <ha-md-list-item>
                          ${formatDateTime(
                            new Date(this._backup.date),
                            this.hass.locale,
                            this.hass.config
                          )}
                          <span slot="supporting-text">Created</span>
                        </ha-md-list-item>
                      </ha-md-list>
                    </div>
                  </ha-card>
                  <ha-card header="Locations">
                    <div class="card-content">
                      <ha-md-list>
                        ${this._backup.agent_ids?.map((agent) => {
                          const [domain, name] = agent.split(".");
                          const domainName = domainToName(
                            this.hass.localize,
                            domain
                          );

                          return html`
                            <ha-md-list-item>
                              <img
                                .src=${brandsUrl({
                                  domain,
                                  type: "icon",
                                  useFallback: true,
                                  darkOptimized: this.hass.themes?.darkMode,
                                })}
                                crossorigin="anonymous"
                                referrerpolicy="no-referrer"
                                alt=""
                                slot="start"
                              />
                              <div slot="headline">${domainName}: ${name}</div>
                              <ha-button-menu
                                slot="end"
                                @action=${this._handleAgentAction}
                                .agent=${agent}
                                fixed
                              >
                                <ha-icon-button
                                  slot="trigger"
                                  .label=${this.hass.localize("ui.common.menu")}
                                  .path=${mdiDotsVertical}
                                ></ha-icon-button>
                                <ha-list-item graphic="icon">
                                  <ha-svg-icon
                                    slot="graphic"
                                    .path=${mdiDownload}
                                  ></ha-svg-icon>
                                  Download from this location
                                </ha-list-item>
                              </ha-button-menu>
                            </ha-md-list-item>
                          `;
                        })}
                      </ha-md-list>
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
  }

  private _selectedBackupChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedBackup = ev.detail.value;
  }

  private _isRestoreDisabled() {
    return (
      !this._selectedBackup ||
      !(
        this._selectedBackup?.database_included ||
        this._selectedBackup?.homeassistant_included ||
        this._selectedBackup.addons.length ||
        this._selectedBackup.folders.length
      )
    );
  }

  private async _restore() {
    let password: string | undefined;
    if (this._backup?.protected) {
      const response = await showPromptDialog(this, {
        inputType: "password",
        inputLabel: "Password",
        title: "Enter password",
      });
      if (!response) {
        return;
      }
      password = response;
    } else {
      const response = await showConfirmationDialog(this, {
        title: "Restore backup",
        text: "The backup will be restored to your instance.",
        confirmText: "Restore",
        dismissText: "Cancel",
        destructive: true,
      });
      if (!response) {
        return;
      }
    }

    const preferedAgent = getPreferredAgentForDownload(
      this._backup!.agent_ids!
    );

    const { addons, database_included, homeassistant_included, folders } =
      this._selectedBackup!;

    await restoreBackup(this.hass, {
      backup_id: this._backup!.backup_id,
      agent_id: preferedAgent,
      password: password,
      restore_addons: addons.map((addon) => addon.slug),
      restore_database: database_included,
      restore_folders: folders,
      restore_homeassistant: homeassistant_included,
    });
  }

  private async _fetchBackup() {
    try {
      const response = await fetchBackupDetails(this.hass, this.backupId);
      this._backup = response.backup;
    } catch (err: any) {
      this._error = err?.message || "Could not fetch backup details";
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._downloadBackup();
        break;
      case 1:
        this._deleteBackup();
        break;
    }
  }

  private _handleAgentAction(ev: CustomEvent<ActionDetail>) {
    const button = ev.currentTarget;
    const agentId = (button as any).agent;
    this._downloadBackup(agentId);
  }

  private async _downloadBackup(agentId?: string): Promise<void> {
    const preferedAgent =
      agentId ?? getPreferredAgentForDownload(this._backup!.agent_ids!);
    const signedUrl = await getSignedPath(
      this.hass,
      getBackupDownloadUrl(this._backup!.backup_id, preferedAgent)
    );
    fileDownload(signedUrl.path);
  }

  private async _deleteBackup(): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: "Delete backup",
      text: "This backup will be permanently deleted.",
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    await deleteBackup(this.hass, this._backup!.backup_id);
    navigate("/config/backup");
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: grid;
    }
    .card-content {
      padding: 0 20px 8px 20px;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    ha-md-list {
      background: none;
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item img {
      width: 48px;
    }
    .warning {
      color: var(--error-color);
    }
    .warning ha-svg-icon {
      color: var(--error-color);
    }
    ha-backup-data-picker {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-details": HaConfigBackupDetails;
  }
}
