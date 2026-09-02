import {
  mdiBackupRestore,
  mdiFolder,
  mdiInformationOutline,
  mdiNas,
  mdiPlayBox,
  mdiReload,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { navigate } from "../../../common/navigate";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-alert";
import "../../../components/ha-bar";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import "../../../components/ha-spinner";
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
import { panelIsReady } from "../../../layouts/panel-ready";
import type { HomeAssistant, Route } from "../../../types";
import { bytesToString } from "../../../util/bytes-to-string";
import "../core/ha-config-analytics";
import { showMoveDatadiskDialog } from "./show-dialog-move-datadisk";
import { showMountViewDialog } from "./show-dialog-view-mount";
import "./storage-breakdown-chart";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _error?: { code: string; message: string };

  @state() private _hostInfo?: HassioHostInfo;

  @state() private _storageInfo?: HostDisksUsage | null;

  @state() private _mountsInfo?: SupervisorMounts | null;

  // Keyed by mount name. A missing key means the request is still in flight;
  // null means it failed, and that row simply shows no usage.
  @state() private _mountUsage: Record<string, HostDisksUsage | null> = {};

  // Guards against a slow response from a previous reload landing in a newer one.
  private _mountUsageGeneration = 0;

  protected async firstUpdated(
    changedProps: PropertyValues<this>
  ): Promise<void> {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass.config, "hassio")) {
      await this._load();
    } else {
      this._mountsInfo = null;
    }
    await panelIsReady(this);
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
          ${
            this._error
              ? html`
                  <ha-alert alert-type="error"
                    >${this._error.message || this._error.code}</ha-alert
                  >
                `
              : ""
          }
          ${
            this._hostInfo
              ? html`
                  <ha-card
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.config.storage.disk_metrics"
                    )}
                  >
                    <div class="card-content">
                      <storage-breakdown-chart
                        .hass=${this.hass}
                        .hostInfo=${this._hostInfo}
                        .storageInfo=${this._storageInfo}
                      ></storage-breakdown-chart>
                      ${this._renderDiskLifeTime(this._hostInfo.disk_life_time)}
                    </div>
                    ${
                      this._hostInfo
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
                        : nothing
                    }
                  </ha-card>
                `
              : ""
          }

          <ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.storage.network_mounts.title"
            )}
          >
            ${
              this._mountsInfo === null
                ? html`<ha-alert
                    class="mounts-not-supported"
                    alert-type="warning"
                    .title=${this.hass.localize(
                      "ui.panel.config.storage.network_mounts.not_supported.title"
                    )}
                  >
                    ${
                      isHAOS
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
                          )
                    }
                  </ha-alert>`
                : validMounts?.length
                  ? html`<ha-list>
                      ${validMounts.map(
                        (mount) => html`
                          <ha-list-item
                            graphic="avatar"
                            .mount=${mount}
                            twoline
                            multiline-secondary
                            hasMeta
                            @click=${this._changeMount}
                          >
                            <div slot="graphic">
                              <ha-svg-icon
                                .path=${
                                  mount.usage === SupervisorMountUsage.MEDIA
                                    ? mdiPlayBox
                                    : mount.usage === SupervisorMountUsage.SHARE
                                      ? mdiFolder
                                      : mdiBackupRestore
                                }
                              ></ha-svg-icon>
                            </div>
                            <span
                              class="mount-state-${mount.state || "unknown"}"
                            >
                              ${mount.name}
                            </span>
                            <span slot="secondary">
                              <span class="mount-address">
                                ${mount.server}${
                                  mount.port ? `:${mount.port}` : ""
                                }${
                                  mount.type === SupervisorMountType.NFS
                                    ? mount.path
                                    : `:${mount.share}`
                                }
                              </span>
                              ${this._renderMountUsage(mount)}
                            </span>
                            ${
                              mount.state !== SupervisorMountState.ACTIVE
                                ? html`<ha-icon-button
                                    class="reload-btn"
                                    slot="meta"
                                    .mount=${mount}
                                    @click=${this._reloadMount}
                                    .path=${mdiReload}
                                  ></ha-icon-button>`
                                : html`<ha-icon-next
                                    slot="meta"
                                  ></ha-icon-next>`
                            }
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
                    </div>`
            }
            ${
              this._mountsInfo !== null
                ? html`<div class="card-actions">
                    <ha-button appearance="plain" @click=${this._addMount}>
                      ${this.hass.localize(
                        "ui.panel.config.storage.network_mounts.add_title"
                      )}
                    </ha-button>
                  </div>`
                : nothing
            }
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
            .path=${mdiInformationOutline}
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

  private _renderMountUsage(mount: SupervisorMount) {
    if (mount.state !== SupervisorMountState.ACTIVE) {
      return nothing;
    }
    if (!(mount.name in this._mountUsage)) {
      return html`<div class="mount-usage">
        <ha-spinner size="tiny"></ha-spinner>
      </div>`;
    }
    const usage = this._mountUsage[mount.name];
    // Without a total there is no ratio to show, so show nothing rather than a
    // bar that means something else.
    if (!usage?.total_bytes) {
      return nothing;
    }
    const percent = (usage.used_bytes / usage.total_bytes) * 100;
    return html`<div class="mount-usage">
      <ha-bar
        class=${classMap({
          "target-warning": percent > 85,
          "target-critical": percent > 95,
        })}
        .value=${percent}
      ></ha-bar>
      <span>
        ${this.hass.localize("ui.panel.config.storage.detailed_description", {
          used: bytesToString(usage.used_bytes),
          total: bytesToString(usage.total_bytes),
        })}
      </span>
    </div>`;
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
      this._storageInfo = await fetchHostDisksUsage(this.hass, "default", 3);
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
    this._loadMountUsage();
  }

  // Deliberately not awaited: a mount on a slow or unreachable server can take
  // ~30 s to answer, and the rows must paint before then. Only active mounts are
  // asked, since the endpoint has nothing to report for the others.
  private _loadMountUsage(): void {
    const generation = ++this._mountUsageGeneration;
    this._mountUsage = {};
    this._mountsInfo?.mounts
      .filter((mount) => mount.state === SupervisorMountState.ACTIVE)
      .forEach((mount) => {
        fetchHostDisksUsage(this.hass, mount.name).then(
          (usage) => this._setMountUsage(generation, mount.name, usage),
          () => this._setMountUsage(generation, mount.name, null)
        );
      });
  }

  private _setMountUsage(
    generation: number,
    name: string,
    usage: HostDisksUsage | null
  ): void {
    if (generation !== this._mountUsageGeneration) {
      return;
    }
    this._mountUsage = { ...this._mountUsage, [name]: usage };
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

    /* multiline-secondary lets the secondary slot wrap, so the address keeps its
       own single ellipsized line and only the usage sits below it. */
    .mount-address {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mount-usage {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      margin-top: var(--ha-space-1);
    }

    .mount-usage ha-bar {
      flex: 0 0 72px;
      display: flex;
      align-self: center;
      --ha-bar-primary-color: var(--metric-bar-ok-color, var(--success-color));
    }

    .mount-usage ha-bar.target-warning {
      --ha-bar-primary-color: var(
        --metric-bar-warning-color,
        var(--warning-color)
      );
    }

    .mount-usage ha-bar.target-critical {
      --ha-bar-primary-color: var(
        --metric-bar-critical-color,
        var(--error-color)
      );
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
      --ha-icon-button-size: 20px;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}
