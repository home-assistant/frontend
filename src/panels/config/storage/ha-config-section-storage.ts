import "@material/mwc-list";
import {
  mdiBackupRestore,
  mdiFolder,
  mdiNas,
  mdiPlayBox,
  mdiReload,
} from "@mdi/js";
import {
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-metric";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-next";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { HassioHostInfo, fetchHassioHostInfo } from "../../../data/hassio/host";
import {
  SupervisorMount,
  SupervisorMountState,
  SupervisorMountType,
  SupervisorMountUsage,
  SupervisorMounts,
  fetchSupervisorMounts,
  reloadSupervisorMount,
} from "../../../data/supervisor/mounts";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../util/calculate";
import "../core/ha-config-analytics";
import { showMoveDatadiskDialog } from "./show-dialog-move-datadisk";
import { showMountViewDialog } from "./show-dialog-view-mount";
import { navigate } from "../../../common/navigate";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: { code: string; message: string };

  @state() private _hostInfo?: HassioHostInfo;

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
                    <ha-metric
                      .heading=${this.hass.localize(
                        "ui.panel.config.storage.used_space"
                      )}
                      .value=${this._getUsedSpace(
                        this._hostInfo?.disk_used,
                        this._hostInfo?.disk_total
                      )}
                      .tooltip=${`${this._hostInfo.disk_used} GB/${this._hostInfo.disk_total} GB`}
                    ></ha-metric>
                    ${this._hostInfo.disk_life_time !== "" &&
                    this._hostInfo.disk_life_time >= 10
                      ? // prettier-ignore
                        html`
                          <ha-metric
                            .heading=${this.hass.localize(
                              "ui.panel.config.storage.emmc_lifetime_used"
                            )}
                            .value=${this._hostInfo.disk_life_time}
                            .tooltip=${`${this._hostInfo.disk_life_time - 10}% - ${this._hostInfo.disk_life_time}%`}
                            class="emmc"
                          ></ha-metric>
                        `
                      : ""}
                  </div>
                  ${this._hostInfo
                    ? html`<div class="card-actions">
                        <mwc-button @click=${this._moveDatadisk}>
                          ${this.hass.localize(
                            "ui.panel.config.storage.datadisk.title"
                          )}
                        </mwc-button>
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
                        <mwc-button
                          slot="action"
                          @click=${this._navigateToUpdates}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.storage.network_mounts.not_supported.navigate_to_updates"
                          )}
                        </mwc-button>`
                    : this.hass.localize(
                        "ui.panel.config.storage.network_mounts.not_supported.supervised"
                      )}
                </ha-alert>`
              : validMounts?.length
              ? html`<mwc-list>
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
                </mwc-list>`
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
                  <mwc-button @click=${this._addMount}>
                    ${this.hass.localize(
                      "ui.panel.config.storage.network_mounts.add_title"
                    )}
                  </mwc-button>
                </div>`
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _load() {
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

  private _getUsedSpace = (used: number, total: number) =>
    roundWithOneDecimal(getValueInPercentage(used, 0, total));

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
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
      border-radius: 50%;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}
