import "@material/mwc-button/mwc-button";
import {mdiFileUpload } from "@mdi/js";
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
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-next";
import "@material/mwc-button/mwc-button";
import { fileDownload } from "../../../../../../src/util/file_download";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../components/ha-form/ha-form";
import {
  fetchZHANetworkSettings,
  createZHANetworkBackup,
  ZHANetworkBackup,
} from "../../../../../data/zha";

@customElement("zha-network-page")
class ZHANetworkPage extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() private _settings?: ZHANetworkBackup;

  @state() private _uploading = false;

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
        .header=${this.hass.localize(
          "ui.panel.config.zha.network.caption"
        )}
      >
        ${this._settings ?
        html`<ha-card
          header=${this.hass.localize(
            "ui.panel.config.zha.network.current_settings_title"
          )}
        >
          <p>PAN ID: ${this._settings!.network_info.pan_id}</p>
          <p>Extended PAN ID: ${this._settings!.network_info.extended_pan_id}</p>
          <p>Channel: ${this._settings!.network_info.channel}</p>
          <p>Coordinator IEEE: ${this._settings!.node_info.ieee}</p>
          <p>Network key: ${this._settings!.network_info.network_key.key}</p>
        </ha-card>

        <ha-card>
          <mwc-button
            slot="primaryAction"
            @click=${this._createAndDownloadBackup}
          >
            ${this.hass.localize(
              "ui.panel.config.zwave_js.update_firmware.begin_update"
            )}
          </mwc-button>
        </ha-card>

        <ha-card>
          <mwc-button
            slot="primaryAction"
            @click=${this._beginRestore}
            .disabled=${this._backupFile === undefined}
          >
            ${this.hass.localize(
              "ui.panel.config.zwave_js.update_firmware.begin_update"
            )}
          </mwc-button>
          <ha-file-upload
            .hass=${this.hass}
            .uploading=${this._uploading}
            .icon=${mdiFileUpload}
            label=${this._backupFile?.name ??"Upload Backup"}
            @file-picked=${this._uploadFile}
          ></ha-file-upload>
        </ha-card>
        `
        : ""}
      </hass-tabs-subpage>
    `;
  }

  private async _fetchSettings(): Promise<void> {
    this._settings = await fetchZHANetworkSettings(this.hass!);
  }

  private async _createAndDownloadBackup(): Promise<void> {
    let backup = await createZHANetworkBackup(this.hass!);
    let backupJSON = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 4));
    let backupTime = Date.parse(backup.backup_time);

    fileDownload(backupJSON, "zha-backup.json");
  }

  private async _uploadFile(ev) {
    this._backupFile = ev.detail.files[0];
  }

  private async _beginRestore(): Promise<void> {
    this._uploading = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    this._uploading = false;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-page": ZHANetworkPage;
  }
}
