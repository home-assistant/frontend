import { mdiPower } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { relativeTime } from "../../../common/datetime/relative_time";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-navigation-list";
import { BackupContent, fetchBackupInfo } from "../../../data/backup";
import { CloudStatus, fetchCloudStatus } from "../../../data/cloud";
import { BOARD_NAMES, HardwareInfo } from "../../../data/hardware";
import { fetchHassioBackups, HassioBackup } from "../../../data/hassio/backup";
import {
  fetchHassioHassOsInfo,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo,
} from "../../../data/hassio/host";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

@customElement("ha-config-system-navigation")
class HaConfigSystemNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @state() private _latestBackupDate?: string;

  @state() private _boardName?: string;

  @state() private _storageInfo?: { used: number; free: number; total: number };

  @state() private _externalAccess = false;

  protected render(): TemplateResult {
    const pages = configSections.general
      .filter((page) => canShowPage(this.hass, page))
      .map((page) => {
        let description = "";

        switch (page.translationKey) {
          case "backup":
            description = this._latestBackupDate
              ? this.hass.localize(
                  "ui.panel.config.backup.description",
                  "relative_time",
                  relativeTime(
                    new Date(this._latestBackupDate),
                    this.hass.locale
                  )
                )
              : this.hass.localize(
                  "ui.panel.config.backup.description_no_backup"
                );
            break;
          case "network":
            description = this.hass.localize(
              "ui.panel.config.network.description",
              "state",
              this._externalAccess
                ? this.hass.localize("ui.panel.config.network.enabled")
                : this.hass.localize("ui.panel.config.network.disabled")
            );
            break;
          case "storage":
            description = this._storageInfo
              ? this.hass.localize(
                  "ui.panel.config.storage.description",
                  "percent_used",
                  `${Math.round(
                    (this._storageInfo.used / this._storageInfo.total) * 100
                  )}${blankBeforePercent(this.hass.locale)}%`,
                  "free_space",
                  `${this._storageInfo.free} GB`
                )
              : "";
            break;
          case "hardware":
            description =
              this._boardName ||
              this.hass.localize("ui.panel.config.hardware.description");
            break;

          default:
            description = this.hass.localize(
              `ui.panel.config.${page.translationKey}.description`
            );
            break;
        }

        return {
          ...page,
          name: page.translationKey
            ? this.hass.localize(
                `ui.panel.config.${page.translationKey}.caption`
              )
            : page.name,
          description,
        };
      });

    return html`
      <hass-subpage
        .hass=${this.hass}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.dashboard.system.main")}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .path=${mdiPower}
          .label=${this.hass.localize(
            "ui.panel.config.system_dashboard.restart_homeassistant"
          )}
          @click=${this._showRestartDialog}
        ></ha-icon-button>
        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          <ha-card outlined>
            <ha-navigation-list
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${pages}
              hasSecondary
              .label=${this.hass.localize(
                "ui.panel.config.dashboard.system.main"
              )}
            ></ha-navigation-list>
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  protected firstUpdated(_changedProperties): void {
    super.firstUpdated(_changedProperties);

    this._fetchNetworkStatus();
    const isHassioLoaded = isComponentLoaded(this.hass, "hassio");
    this._fetchBackupInfo(isHassioLoaded);
    this._fetchHardwareInfo(isHassioLoaded);
    if (isHassioLoaded) {
      this._fetchStorageInfo();
    }
  }

  private async _fetchBackupInfo(isHassioLoaded: boolean) {
    const backups: BackupContent[] | HassioBackup[] = isHassioLoaded
      ? await fetchHassioBackups(this.hass)
      : isComponentLoaded(this.hass, "backup")
      ? await fetchBackupInfo(this.hass).then(
          (backupData) => backupData.backups
        )
      : [];

    if (backups.length > 0) {
      this._latestBackupDate = (backups as any[]).reduce((a, b) =>
        a.date > b.date ? a : b
      ).date;
    }
  }

  private async _fetchHardwareInfo(isHassioLoaded: boolean) {
    if (isComponentLoaded(this.hass, "hardware")) {
      const hardwareInfo: HardwareInfo = await this.hass.callWS({
        type: "hardware/info",
      });
      this._boardName = hardwareInfo?.hardware.find((hw) => hw.board !== null)
        ?.name;
    } else if (isHassioLoaded) {
      const osData: HassioHassOSInfo = await fetchHassioHassOsInfo(this.hass);
      if (osData.board) {
        this._boardName = BOARD_NAMES[osData.board];
      }
    }
  }

  private async _fetchStorageInfo() {
    const hostInfo: HassioHostInfo = await fetchHassioHostInfo(this.hass);
    this._storageInfo = {
      used: hostInfo.disk_used,
      free: hostInfo.disk_free,
      total: hostInfo.disk_total,
    };
  }

  private async _fetchNetworkStatus() {
    if (isComponentLoaded(this.hass, "cloud")) {
      const cloudStatus = await fetchCloudStatus(this.hass);
      if (cloudStatus.logged_in) {
        this._externalAccess = true;
        return;
      }
    }
    this._externalAccess = this.hass.config.external_url !== null;
  }

  private async _showRestartDialog() {
    showRestartDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host(:not([narrow])) ha-card {
          margin-bottom: max(24px, env(safe-area-inset-bottom));
        }

        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-card {
          overflow: hidden;
          margin-bottom: 24px;
          margin-bottom: max(24px, env(safe-area-inset-bottom));
        }

        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }

        .restart-section {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: center;
          margin-bottom: 24px;
        }

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: 0;
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
        }

        ha-navigation-list {
          --navigation-list-item-title-font-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-system-navigation": HaConfigSystemNavigation;
  }
}
