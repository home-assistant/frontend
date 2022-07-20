import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { zhaTabs } from "./zha-config-dashboard";
import "../../../../../components/ha-card";
import { showZHARestoreBackupDialog } from "./show-dialog-zha-restore-backup";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-circular-progress";
import "@material/mwc-button/mwc-button";
import { fileDownload } from "../../../../../../src/util/file_download";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-file-upload";
import {
  fetchZHANetworkSettings,
  createZHANetworkBackup,
  ZHANetworkBackup,
  ZHANetworkBackupAndMetadata,
} from "../../../../../data/zha";

import { showAlertDialog } from "../../../../../../src/dialogs/generic/show-dialog-box";

@customElement("zha-network-page")
class ZHANetworkPage extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() private _settings?: ZHANetworkBackup;

  @state() private _uploadingBackup = false;
  @state() private _restoringBackup = false;
  @state() private _generatingBackup = false;

  @state() private _backupFile?: File;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchSettings();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .tabs=${zhaTabs}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .header=${this.hass.localize("ui.panel.config.zha.network.caption")}
      >
        ${this._settings
          ? html`<ha-card
              header=${this.hass.localize(
                "ui.panel.config.zha.network.settings_title"
              )}
            >
              <div class="card-content network-settings">
                <div>PAN ID: ${this._settings!.network_info.pan_id}</div>
                <div>
                  Extended PAN ID:
                  ${this._settings!.network_info.extended_pan_id}
                </div>
                <div>Channel: ${this._settings!.network_info.channel}</div>
                <div>Coordinator IEEE: ${this._settings!.node_info.ieee}</div>
                <div>
                  Network key: ${this._settings!.network_info.network_key.key}
                </div>
              </div>

              <div class="card-actions">
                <mwc-button
                  @click=${this._createAndDownloadBackup}
                  .disabled=${this._generatingBackup ||
                  this._uploadingBackup ||
                  this._restoringBackup}
                >
                  ${this.hass.localize(
                    "ui.panel.config.zha.network.create_backup"
                  )}

                  <ha-circular-progress
                    active
                    size="small"
                    .indeterminate=${this._generatingBackup}
                    .closed=${!this._generatingBackup}
                  ></ha-circular-progress>
                </mwc-button>

                <mwc-button
                  class="warning"
                  @click=${this._beginRestore}
                  .disabled=${this._generatingBackup ||
                  this._uploadingBackup ||
                  this._restoringBackup}
                >
                  ${this.hass.localize(
                    "ui.panel.config.zha.network.restore_backup"
                  )}
                </mwc-button>
              </div>
            </ha-card> `
          : ""}
      </hass-tabs-subpage>
    `;
  }

  private async _fetchSettings(): Promise<void> {
    this._settings = await fetchZHANetworkSettings(this.hass!);
  }

  private async _createAndDownloadBackup(): Promise<void> {
    this._generatingBackup = true;
    const backup_and_metadata: ZHANetworkBackupAndMetadata =
      await createZHANetworkBackup(this.hass!);
    this._generatingBackup = false;

    if (!backup_and_metadata.is_complete) {
      await showAlertDialog(this, {
        title: "Backup is incomplete",
        text: "A backup has been created but it is incomplete and cannot be restored. This is a coordinator firmware limitation.",
      });
    }

    const backupJSON: string =
      "data:text/plain;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backup_and_metadata.backup, null, 4));
    const backupTime: Date = new Date(
      Date.parse(backup_and_metadata.backup.backup_time)
    );
    let filename: string = backupTime.toISOString().replace(/:/g, "-");

    if (!backup_and_metadata.is_complete) {
      filename += ", incomplete";
    }

    fileDownload(backupJSON, `ZHA backup ${filename}.json`);
  }

  private async _beginRestore(): Promise<void> {
    showZHARestoreBackupDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: 16px;
          max-width: 500px;
        }

        ha-card h1 {
          margin-bottom: 4px;
        }

        mwc-button > ha-circular-progress {
          margin-left: 16px;
        }

        .network-settings > div {
          word-break: break-all;
          margin-top: 2px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-page": ZHANetworkPage;
  }
}
