import {
  mdiBackupRestore,
  mdiFolder,
  mdiInformation,
  mdiNas,
  mdiPlayBox,
  mdiReload,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { navigate } from "../../../common/navigate";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import "../../../components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type { HassioHostInfo, HostDisksUsage } from "../../../data/hassio/host";
import {
  fetchHassioHostInfo,
  fetchHostDisksUsage,
} from "../../../data/hassio/host";
import type {
  SupervisorMount,
  SupervisorMounts,
} from "../../../data/supervisor/mounts";
import {
  SupervisorMountState,
  SupervisorMountType,
  SupervisorMountUsage,
  fetchSupervisorMounts,
  reloadSupervisorMount,
} from "../../../data/supervisor/mounts";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { roundWithOneDecimal } from "../../../util/calculate";
import "../core/ha-config-analytics";
import { showMoveDatadiskDialog } from "./show-dialog-move-datadisk";
import { showMountViewDialog } from "./show-dialog-view-mount";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _error?: { code: string; message: string };

  @state() private _hostInfo?: HassioHostInfo;

  @state() private _storageInfo?: HostDisksUsage | null;

  @state() private _mountsInfo?: SupervisorMounts | null;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._load();
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (this._mountsInfo === undefined) {
      return nothing;
    }
    const validMounts = this._mountsInfo?.mounts.filter((mount) =>
      [SupervisorMountType.CIFS, SupervisorMountType.NFS].includes(mount.type)
    );
    const isHAOS = this._hostInfo?.features.includes("haos");
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.storage.caption")}
      >
        <div class="content">
          ${this._error
            ? html`
                <ha-alert alert-type="error"
                  >${this._error.message || this._error.code}</ha-alert
                >
              `
            : ""}
          ${this._hostInfo
            ? html`
                <ha-card
                  outlined
                  .header=${this.hass.localize(
                    "ui.panel.config.storage.disk_metrics"
                  )}
                >
                  <div class="card-content">
                    ${this._renderStorageMetrics(
                      this._hostInfo,
                      this._storageInfo
                    )}
                    ${this._renderDiskLifeTime(this._hostInfo.disk_life_time)}
                  </div>
                  ${this._hostInfo
                    ? html`<div class="card-actions">
                        <ha-button
                          appearance="plain"
                          @click=${this._moveDatadisk}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.storage.datadisk.title"
                          )}
                        </ha-button>
                      </div>`
                    : nothing}
                </ha-card>
              `
            : ""}

          <ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.storage.network_mounts.title"
            )}
          >
            ${this._mountsInfo === null
              ? html`<ha-alert
                  class="mounts-not-supported"
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.panel.config.storage.network_mounts.not_supported.title"
                  )}
                >
                  ${isHAOS
                    ? html`${this.hass.localize(
                          "ui.panel.config.storage.network_mounts.not_supported.os",
                          { version: "10.2" }
                        )}
                        <ha-button
                          appearance="plain"
                          slot="action"
                          @click=${this._navigateToUpdates}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.storage.network_mounts.not_supported.navigate_to_updates"
                          )}
                        </ha-button>`
                    : this.hass.localize(
                        "ui.panel.config.storage.network_mounts.not_supported.supervised"
                      )}
                </ha-alert>`
              : validMounts?.length
                ? html`<ha-list>
                    ${validMounts.map(
                      (mount) => html`
                        <ha-list-item
                          graphic="avatar"
                          .mount=${mount}
                          twoline
                          hasMeta
                          @click=${this._changeMount}
                        >
                          <div slot="graphic">
                            <ha-svg-icon
                              .path=${mount.usage === SupervisorMountUsage.MEDIA
                                ? mdiPlayBox
                                : mount.usage === SupervisorMountUsage.SHARE
                                  ? mdiFolder
                                  : mdiBackupRestore}
                            ></ha-svg-icon>
                          </div>
                          <span class="mount-state-${mount.state || "unknown"}">
                            ${mount.name}
                          </span>
                          <span slot="secondary">
                            ${mount.server}${mount.port
                              ? `:${mount.port}`
                              : nothing}${mount.type === SupervisorMountType.NFS
                              ? mount.path
                              : `:${mount.share}`}
                          </span>
                          ${mount.state !== SupervisorMountState.ACTIVE
                            ? html`<ha-icon-button
                                class="reload-btn"
                                slot="meta"
                                .mount=${mount}
                                @click=${this._reloadMount}
                                .path=${mdiReload}
                              ></ha-icon-button>`
                            : html`<ha-icon-next slot="meta"></ha-icon-next>`}
                        </ha-list-item>
                      `
                    )}
                  </ha-list>`
                : html`<div class="no-mounts">
                    <ha-svg-icon .path=${mdiNas}></ha-svg-icon>
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.storage.network_mounts.no_mounts"
                      )}
                    </p>
                  </div>`}
            ${this._mountsInfo !== null
              ? html`<div class="card-actions">
                  <ha-button appearance="plain" @click=${this._addMount}>
                    ${this.hass.localize(
                      "ui.panel.config.storage.network_mounts.add_title"
                    )}
                  </ha-button>
                </div>`
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _renderDiskLifeTime(diskLifeTime: number | null) {
    if (diskLifeTime === null) {
      return nothing;
    }

    const segments: Segment[] = [
      {
        color: "var(--primary-color)",
        value: diskLifeTime,
      },
      {
        color:
          "var(--ha-bar-background-color, var(--secondary-background-color))",
        value: 100 - diskLifeTime,
      },
    ];

    return html`
      <ha-segmented-bar
        .heading=${this.hass.localize("ui.panel.config.storage.lifetime")}
        .description=${this.hass.localize(
          "ui.panel.config.storage.lifetime_description",
          {
            lifetime: `${diskLifeTime}${blankBeforePercent(this.hass.locale)}%`,
          }
        )}
        .segments=${segments}
        hide-legend
        hide-tooltip
      >
        <ha-tooltip slot="extra">
          <ha-icon-button
            .path=${mdiInformation}
            class="help-button"
          ></ha-icon-button>
          <p class="metric-description" slot="content">
            ${this.hass.localize(
              "ui.panel.config.storage.lifetime_used_description"
            )}
          </p>
        </ha-tooltip>
      </ha-segmented-bar>
    `;
  }

  private _renderStorageMetrics = memoizeOne(
    (hostInfo?: HassioHostInfo, storageInfo?: HostDisksUsage | null) => {
      if (!hostInfo) {
        return nothing;
      }
      const computedStyles = getComputedStyle(this);
      let totalSpaceGB = hostInfo.disk_total;
      let usedSpaceGB = hostInfo.disk_used;
      // hostInfo.disk_free is sometimes 0, so we may need to calculate it
      let freeSpaceGB =
        hostInfo.disk_free || hostInfo.disk_total - hostInfo.disk_used;
      const segments: Segment[] = [];
      if (storageInfo) {
        const totalSpace =
          storageInfo.total_bytes ?? this._gbToBytes(hostInfo.disk_total);
        totalSpaceGB = this._bytesToGB(totalSpace);
        usedSpaceGB = this._bytesToGB(storageInfo.used_bytes);
        freeSpaceGB = this._bytesToGB(totalSpace - storageInfo.used_bytes);
        storageInfo.children?.forEach((child, index) => {
          if (child.used_bytes > 0) {
            const space = this._bytesToGB(child.used_bytes);
            segments.push({
              value: space,
              color: getGraphColorByIndex(index, computedStyles),
              label: html`${this.hass.localize(
                  `ui.panel.config.storage.segments.${child.id}`
                ) ||
                child.label ||
                child.id}
                <span style="color: var(--secondary-text-color)"
                  >${roundWithOneDecimal(space)} GB</span
                >`,
            });
          }
        });
      } else {
        segments.push({
          value: usedSpaceGB,
          color: "var(--primary-color)",
          label: html`${this.hass.localize(
              "ui.panel.config.storage.segments.used"
            )}
            <span style="color: var(--secondary-text-color)"
              >${roundWithOneDecimal(usedSpaceGB)} GB</span
            >`,
        });
      }
      segments.push({
        value: freeSpaceGB,
        color:
          "var(--ha-bar-background-color, var(--secondary-background-color))",
        label: html`${this.hass.localize(
            "ui.panel.config.storage.segments.free"
          )}
          <span style="color: var(--secondary-text-color)"
            >${roundWithOneDecimal(freeSpaceGB)} GB</span
          >`,
      });
      return html`<ha-segmented-bar
          .heading=${this.hass.localize("ui.panel.config.storage.used_space")}
          .description=${this.hass.localize(
            "ui.panel.config.storage.detailed_description",
            {
              used: `${roundWithOneDecimal(usedSpaceGB)} GB`,
              total: `${roundWithOneDecimal(totalSpaceGB)} GB`,
            }
          )}
          .segments=${segments}
        ></ha-segmented-bar>

        ${!storageInfo || storageInfo === null
          ? html`<ha-alert alert-type="info">
              <ha-spinner slot="icon"></ha-spinner>
              ${this.hass.localize(
                "ui.panel.config.storage.loading_detailed"
              )}</ha-alert
            >`
          : nothing}`;
    }
  );

  private _bytesToGB(bytes: number) {
    return bytes / 1024 / 1024 / 1024;
  }

  private _gbToBytes(GB: number) {
    return GB * 1024 * 1024 * 1024;
  }

  private async _load() {
    this._loadStorageInfo();
    try {
      this._hostInfo = await fetchHassioHostInfo(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
    }
    if (this._hostInfo?.features.includes("mount")) {
      await this._reloadMounts();
    } else {
      this._mountsInfo = null;
    }
  }

  private async _loadStorageInfo() {
    try {
      this._storageInfo = await fetchHostDisksUsage(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
      this._storageInfo = null;
    }
  }

  private _moveDatadisk(): void {
    showMoveDatadiskDialog(this, {
      hostInfo: this._hostInfo!,
    });
  }

  private async _navigateToUpdates(): Promise<void> {
    navigate("/config/updates");
  }

  private async _reloadMount(ev: Event): Promise<void> {
    ev.stopPropagation();
    const mount: SupervisorMount = (ev.currentTarget as any).mount;
    try {
      await reloadSupervisorMount(this.hass, mount);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.storage.network_mounts.errors.reload",
          { mount: mount.name }
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    await this._reloadMounts();
  }

  private _addMount(): void {
    showMountViewDialog(this, {
      reloadMounts: () => this._reloadMounts(),
    });
  }

  private _changeMount(ev: Event): void {
    ev.stopPropagation();
    showMountViewDialog(this, {
      mount: (ev.currentTarget as any).mount,
      reloadMounts: () => this._reloadMounts(),
    });
  }

  private async _reloadMounts(): Promise<void> {
    try {
      this._mountsInfo = await fetchSupervisorMounts(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
      this._mountsInfo = null;
    }
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    ha-card {
      max-width: 600px;
      margin: 0 auto 12px;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
    }
    .card-content {
      display: flex;
      justify-content: space-between;
      flex-direction: column;
    }

    .loading-container {
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(var(--rgb-card-background-color), 0.75);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mount-state-failed {
      color: var(--error-color);
    }
    .mount-state-unknown {
      color: var(--warning-color);
    }

    .mounts-not-supported {
      padding: 0 16px 16px;
    }

    .reload-btn {
      float: right;
      position: relative;
      top: -10px;
      right: 10px;
      inset-inline-end: 10px;
      inset-inline-start: initial;
    }

    .help-button {
      --mdc-icon-button-size: 20px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    .no-mounts {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .no-mounts ha-svg-icon {
      background-color: var(--light-primary-color);
      color: var(--secondary-text-color);
      padding: 16px;
      border-radius: var(--ha-border-radius-circle);
      margin-bottom: 8px;
    }
    ha-list-item {
      --mdc-list-item-meta-size: auto;
      --mdc-list-item-meta-display: flex;
    }
    ha-svg-icon,
    ha-icon-next {
      width: 24px;
    }

    ha-alert {
      --ha-alert-icon-size: 24px;
    }

    ha-alert ha-spinner {
      --ha-spinner-size: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}
