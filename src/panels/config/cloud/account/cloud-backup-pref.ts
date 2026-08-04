import {
  mdiBackupRestore,
  mdiCalendar,
  mdiHarddisk,
  mdiShieldLock,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { relativeTime } from "../../../../common/datetime/relative_time";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-spinner";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-svg-icon";
import type { BackupConfig, BackupInfo } from "../../../../data/backup";
import {
  CLOUD_AGENT,
  cloudBackupEnabled,
  fetchBackupConfig,
  fetchBackupInfo,
  getLastCloudBackup,
} from "../../../../data/backup";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { bytesToString } from "../../../../util/bytes-to-string";
import { cloudSubpageStyle } from "./cloud-subpage-style";

@customElement("cloud-backup-pref")
export class CloudBackupPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _backupConfig?: BackupConfig;

  @state() private _backupInfo?: BackupInfo;

  @state() private _loaded = false;

  protected render() {
    const isConfigured = cloudBackupEnabled(this._backupConfig);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.cloud.account.backup.title"
        )}
        back-path="/config/cloud/account"
      >
        <div class="content">
          ${
            this._loaded
              ? isConfigured
                ? this._renderStatusCard()
                : this._renderSetupCard()
              : html`
                  <ha-card outlined>
                    <div class="spinner">
                      <ha-spinner></ha-spinner>
                    </div>
                  </ha-card>
                `
          }
          ${this._renderInfoCard()}
        </div>
      </hass-subpage>
    `;
  }

  private _renderInfoCard() {
    return html`
      <ha-card outlined>
        <div class="card-content">
          <h3 class="info-header">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.backup.card_title"
            )}
          </h3>
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.backup.cloud_info"
            )}
          </p>
          <ul>
            <li>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.backup.cloud_info_one_backup"
              )}
            </li>
            <li>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.backup.cloud_info_size_limit"
              )}
            </li>
            <li>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.backup.cloud_info_encrypted"
              )}
            </li>
            <li>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.backup.cloud_info_no_access"
              )}
            </li>
          </ul>
        </div>
        <div class="card-actions">
          <ha-button
            appearance="plain"
            href="https://support.nabucasa.com/hc/en-us/sections/26353804834973"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.backup.link_learn_more"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderStatusCard() {
    const cloudBackup = getLastCloudBackup(this._backupInfo?.backups);
    const cloudAgent = cloudBackup?.agents[CLOUD_AGENT];

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.cloud.account.backup.status_card_title"
        )}
      >
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">
                ${
                  cloudBackup
                    ? this.hass.localize(
                        "ui.panel.config.cloud.account.backup.last_cloud_backup",
                        {
                          relative_time: relativeTime(
                            new Date(cloudBackup.date),
                            this.hass.locale,
                            new Date(),
                            true
                          ),
                        }
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.backup.no_cloud_backups"
                      )
                }
              </span>
            </ha-md-list-item>
            ${
              cloudAgent
                ? html`
                    <ha-md-list-item>
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiHarddisk}
                      ></ha-svg-icon>
                      <span slot="headline">
                        ${bytesToString(cloudAgent.size)}
                      </span>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiShieldLock}
                      ></ha-svg-icon>
                      <span slot="headline">
                        ${
                          cloudAgent.protected
                            ? this.hass.localize(
                                "ui.panel.config.cloud.account.backup.backup_encrypted"
                              )
                            : this.hass.localize(
                                "ui.panel.config.cloud.account.backup.backup_not_encrypted"
                              )
                        }
                      </span>
                    </ha-md-list-item>
                  `
                : nothing
            }
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">
                ${
                  this._backupConfig?.next_automatic_backup
                    ? this.hass.localize(
                        "ui.panel.config.cloud.account.backup.next_backup",
                        {
                          relative_time: relativeTime(
                            new Date(this._backupConfig.next_automatic_backup),
                            this.hass.locale,
                            new Date(),
                            true
                          ),
                        }
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.backup.no_next_backup"
                      )
                }
              </span>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div class="card-actions">
          <ha-button appearance="filled" href="/config/backup?historyBack=1">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.backup.configure"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderSetupCard() {
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.cloud.account.backup.setup_card_title"
        )}
      >
        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.backup.setup_info"
            )}
          </p>
        </div>
        <div class="card-actions">
          <ha-button appearance="filled" href="/config/backup?historyBack=1">
            ${this.hass.localize("ui.panel.config.cloud.account.backup.set_up")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    if (!isComponentLoaded(this.hass.config, "backup")) {
      // Backup integration isn't loaded, so there's nothing to fetch; fall back
      // to the setup card rather than spinning forever.
      this._loaded = true;
      return;
    }
    try {
      const [configResult, info] = await Promise.all([
        fetchBackupConfig(this.hass),
        fetchBackupInfo(this.hass),
      ]);
      this._backupConfig = configResult.config;
      this._backupInfo = info;
    } catch {
      // Best effort; leave the backup status unknown.
    } finally {
      this._loaded = true;
    }
  }

  static styles = [
    haStyle,
    cloudSubpageStyle,
    css`
      .info-header {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-condensed);
        margin: 0 0 var(--ha-space-2) 0;
      }
      .card-content p,
      .card-content li {
        color: var(--secondary-text-color);
      }
      .card-content a {
        color: var(--primary-color);
      }
      ul {
        padding-left: var(--ha-space-6);
        padding-inline-start: var(--ha-space-6);
        padding-inline-end: initial;
      }
      li {
        margin-bottom: var(--ha-space-2);
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
      }
      ha-md-list {
        background: none;
        --md-list-item-leading-space: 0;
        --md-list-item-trailing-space: 0;
      }
      ha-md-list-item {
        --md-list-item-top-space: var(--ha-space-2);
        --md-list-item-bottom-space: var(--ha-space-2);
        --md-list-item-one-line-container-height: 40px;
      }
      ha-svg-icon[slot="start"] {
        color: var(--secondary-text-color);
      }
      .spinner {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-8) 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-backup-pref": CloudBackupPref;
  }
}
