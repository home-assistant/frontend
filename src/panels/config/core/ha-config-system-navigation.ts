import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { relativeTime } from "../../../common/datetime/relative_time";
import "../../../components/ha-card";
import "../../../components/ha-navigation-list";
import "../../../components/ha-tip";
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
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
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
                  )}%`,
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
        <mwc-button
          slot="toolbar-icon"
          .label=${this.hass.localize(
            "ui.panel.config.system_dashboard.restart_homeassistant_short"
          )}
          @click=${this._restart}
        ></mwc-button>
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

  private _restart() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.system_dashboard.confirm_restart_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.system_dashboard.confirm_restart_text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.system_dashboard.restart_homeassistant_short"
      ),
      confirm: () => {
        this.hass.callService("homeassistant", "restart").catch((reason) => {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.system_dashboard.restart_error"
            ),
            text: reason.message,
          });
        });
      },
    });
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
      this._boardName = hardwareInfo?.hardware?.[0].name;
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
        ha-tip {
          margin-bottom: max(env(safe-area-inset-bottom), 8px);
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
