import {
  mdiAlertCircleOutline,
  mdiBatteryAlertVariantOutline,
  mdiCheck,
  mdiCheckCircleOutline,
  mdiLanDisconnect,
  mdiPackageUp,
  mdiProgressAlert,
  mdiSignalCellular1,
  mdiSignalCellular2,
  mdiSignalCellular3,
  mdiSignalCellularOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { batteryLevelIconPath } from "../../../../../common/entity/battery_icon";
import { blankBeforePercent } from "../../../../../common/translations/blank_before_percent";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-relative-time";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/item/ha-list-item-button";
import "../../../../../components/list/ha-list-base";
import "../../../../../components/list/ha-list-nav";
import type { UpdateEntity } from "../../../../../data/update";
import { updateAvailable } from "../../../../../data/update";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type {
  BandCounts,
  BarBand,
  DeviceReadings,
  FindingKey,
  FirmwareUpdate,
  SignalBand,
} from "./network-health";
import {
  attentionCount,
  BAR_BANDS,
  countBands,
  findings,
  lastSeenAt,
  managedDevices,
  NEEDS_ATTENTION,
  parentByIeee,
  powerSource,
  signalBand,
  sortByArea,
  WORTH_A_LOOK,
} from "./network-health";

const BAND_ICON: Record<SignalBand, string> = {
  strong: mdiSignalCellular3,
  fair: mdiSignalCellular2,
  weak: mdiSignalCellular1,
  unknown: mdiSignalCellularOutline,
};

const FINDING_ICON: Record<FindingKey, string> = {
  offline: mdiLanDisconnect,
  setup_unfinished: mdiProgressAlert,
  weak_signal: mdiSignalCellular1,
  low_battery: mdiBatteryAlertVariantOutline,
  firmware_update: mdiPackageUp,
};

/** Same cadence as the device page, so availability and signal do not freeze while the page is open. */
const DEVICE_REFRESH_INTERVAL = 60000;

const BASE_PATH = "/config/zha/network-health";

@customElement("zha-network-health-page")
class ZHANetworkHealthPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _devices?: ZHADevice[];

  @state() private _updatedAt?: Date;

  @state() private _error?: string;

  private _refreshInterval?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._devices) {
      this._startRefresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRefresh();
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchDevices();
    }
  }

  private async _fetchDevices(): Promise<void> {
    try {
      this._devices = await fetchDevices(this.hass);
      this._updatedAt = new Date();
      // The page may have been left while the request was in flight.
      if (this.isConnected) {
        this._startRefresh();
      }
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _startRefresh(): void {
    this._stopRefresh();
    this._refreshInterval = window.setInterval(
      () => this._refreshDevices(),
      DEVICE_REFRESH_INTERVAL
    );
  }

  private _stopRefresh(): void {
    if (this._refreshInterval) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = undefined;
    }
  }

  private async _refreshDevices(): Promise<void> {
    try {
      this._devices = await fetchDevices(this.hass);
      this._updatedAt = new Date();
    } catch (_err: any) {
      // Keep the last snapshot; "Updated" keeps showing its age.
    }
  }

  private _managedDevices = memoizeOne(managedDevices);

  /** Built once per device list rather than per rendered row. */
  private _parentByIeee = memoizeOne(parentByIeee);

  private _readings: DeviceReadings = {
    batteryLevel: (device) => {
      for (const entity of device.entities) {
        const stateObj = entity.entity_id
          ? this.hass.states[entity.entity_id]
          : undefined;
        if (stateObj?.attributes.device_class === "battery") {
          const level = Number(stateObj.state);
          if (!isNaN(level)) {
            return level;
          }
        }
      }
      return null;
    },
    firmwareUpdate: (device): FirmwareUpdate | null => {
      for (const entity of device.entities) {
        if (!entity.entity_id?.startsWith("update.")) continue;
        const stateObj = this.hass.states[entity.entity_id] as
          UpdateEntity | undefined;
        if (stateObj && updateAvailable(stateObj)) {
          return {
            installed: stateObj.attributes.installed_version,
            latest: stateObj.attributes.latest_version,
          };
        }
      }
      return null;
    },
  };

  private _deviceName = (device: ZHADevice): string =>
    device.user_given_name || device.name;

  private _areaName = (device: ZHADevice): string | undefined =>
    device.area_id
      ? (this.hass.areas[device.area_id]?.name ?? device.area_id)
      : undefined;

  /** The finding a subpage shows, taken from the path below the page. */
  private get _subpage(): FindingKey | undefined {
    const key = this.route?.path?.replace(/^\//, "").split("/")[0];
    return WORTH_A_LOOK.includes(key as FindingKey)
      ? (key as FindingKey)
      : undefined;
  }

  private _t(key: string, values?: Record<string, any>): string {
    return this.hass.localize(
      `ui.panel.config.zha.network_health.${key}` as any,
      values
    );
  }

  protected render(): TemplateResult {
    const subpage = this._subpage;
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${subpage ? this._t(subpage) : this._t("title")}
        .backPath=${subpage ? BASE_PATH : "/config/zha/dashboard"}
      >
        <div class="container">${this._renderContent(subpage)}</div>
      </hass-subpage>
    `;
  }

  private _renderContent(subpage?: FindingKey): TemplateResult {
    if (this._error) {
      return html`
        <ha-alert alert-type="error" .title=${this._t("loading_error")}>
          ${this._error}
        </ha-alert>
      `;
    }

    if (!this._devices) {
      return html`
        <div class="loading">
          <ha-spinner size="large"></ha-spinner>
        </div>
      `;
    }

    const devices = this._managedDevices(this._devices);
    const found = findings(devices, this._readings);

    if (subpage) {
      return this._renderSubpage(subpage, found[subpage]);
    }

    return html`
      ${this._renderSnapshotCard(devices)} ${this._renderAttentionCard(found)}
      ${this._renderWorthALookCard(found)}
    `;
  }

  private _renderBar(counts: BandCounts): TemplateResult {
    return html`
      <div class="bar">
        ${BAR_BANDS.map((band: BarBand) =>
          counts[band]
            ? html`<div
                class="segment ${band}"
                style=${`flex-grow:${counts[band]}`}
              ></div>`
            : nothing
        )}
      </div>
    `;
  }

  private _renderSnapshotCard(devices: ZHADevice[]): TemplateResult {
    const offline = devices.filter((device) => !device.available).length;
    const counts = countBands(devices);
    const rated = counts.strong + counts.fair + counts.weak + counts.offline;
    // A single sleeping device is everyday life, not an outage: the network is
    // only down once nothing answers at all. Matches the ZHA dashboard.
    const online = offline < devices.length || devices.length === 0;

    return html`
      <ha-card>
        <div class="status">
          <div class="icon ${online ? "success" : "error"}">
            <ha-svg-icon
              .path=${online ? mdiCheck : mdiAlertCircleOutline}
            ></ha-svg-icon>
          </div>
          <div class="status-text">
            <h2>${this._t(`status_${online ? "online" : "offline"}`)}</h2>
            <p>
              ${
                offline
                  ? this._t("some_offline", { count: devices.length, offline })
                  : this._t("all_online", { count: devices.length })
              }
            </p>
          </div>
        </div>
        ${
          rated
            ? html`
                <div class="distribution">
                  ${this._renderBar(counts)}
                  <div class="legend">
                    ${BAR_BANDS.map(
                      (band: BarBand) => html`
                        <span class="legend-item">
                          <span class="dot ${band}"></span>
                          ${this._t(`signal_${band}`, { count: counts[band] })}
                        </span>
                      `
                    )}
                  </div>
                </div>
              `
            : nothing
        }
        <div class="snapshot">
          <p>${this._t("snapshot")}</p>
          <p class="updated">
            ${this._t("updated")}
            <ha-relative-time .datetime=${this._updatedAt}></ha-relative-time>
          </p>
        </div>
      </ha-card>
    `;
  }

  private _renderAttentionCard(found: Record<FindingKey, ZHADevice[]>) {
    const count = attentionCount(found);
    return html`
      <ha-card>
        <h2 class="card-title">
          ${this._t("needs_attention")}${count ? html` · ${count}` : nothing}
        </h2>
        ${
          count
            ? NEEDS_ATTENTION.filter((key) => found[key].length).map(
                (key) => html`
                  <div class="finding">
                    <ha-svg-icon .path=${FINDING_ICON[key]}></ha-svg-icon>
                    <div>
                      <h3>${this._t(key)} · ${found[key].length}</h3>
                      <p>${this._t(`${key}_advice`)}</p>
                    </div>
                  </div>
                  <ha-list-nav .ariaLabel=${this._t(key)}>
                    ${this._sorted(found[key]).map((device) =>
                      this._renderAttentionDevice(key, device)
                    )}
                  </ha-list-nav>
                `
              )
            : html`
                <div class="all-good">
                  <ha-svg-icon .path=${mdiCheckCircleOutline}></ha-svg-icon>
                  ${this._t("nothing_needs_attention")}
                </div>
              `
        }
      </ha-card>
    `;
  }

  private _renderAttentionDevice(
    key: FindingKey,
    device: ZHADevice
  ): TemplateResult {
    const power = powerSource(device);
    const seen = lastSeenAt(device);
    const details = [
      this._areaName(device),
      // A mains device that is offline is often just switched off at the wall.
      key === "offline" && power ? this._t(`power_${power}`) : device.model,
      key === "offline" && seen
        ? this._t("last_seen", {
            time: relativeTime(seen, this.hass.locale),
          })
        : undefined,
    ].filter(Boolean);

    return html`
      <ha-list-item-button href=${`/config/zha/device/${device.ieee}`}>
        <ha-svg-icon
          slot="start"
          class="muted"
          .path=${FINDING_ICON[key]}
        ></ha-svg-icon>
        <span slot="headline">${this._deviceName(device)}</span>
        <span slot="supporting-text">${details.join(" · ")}</span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderWorthALookCard(found: Record<FindingKey, ZHADevice[]>) {
    return html`
      <ha-card>
        <h2 class="card-title">${this._t("worth_a_look")}</h2>
        <ha-list-nav .ariaLabel=${this._t("worth_a_look")}>
          ${WORTH_A_LOOK.map(
            (key) => html`
              <ha-list-item-button href=${`${BASE_PATH}/${key}`}>
                <ha-svg-icon
                  slot="start"
                  .path=${FINDING_ICON[key]}
                ></ha-svg-icon>
                <span slot="headline">${this._t(key)}</span>
                <span slot="supporting-text"
                  >${this._t(`${key}_secondary`)}</span
                >
                <span slot="end" class="value">${found[key].length}</span>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>
            `
          )}
        </ha-list-nav>
      </ha-card>
    `;
  }

  private _renderSubpage(key: FindingKey, devices: ZHADevice[]) {
    return html`
      <ha-card>
        <p class="advice">${this._t(`${key}_advice`)}</p>
        ${
          devices.length
            ? html`
                <ha-list-nav .ariaLabel=${this._t(key)}>
                  ${devices.map((device) =>
                    this._renderValueDevice(key, device)
                  )}
                </ha-list-nav>
              `
            : html`
                <ha-list-base>
                  <ha-list-item-base>
                    <span slot="headline">${this._t("no_devices")}</span>
                  </ha-list-item-base>
                </ha-list-base>
              `
        }
      </ha-card>
    `;
  }

  /** A device row with the value of its finding in front of the chevron. */
  private _renderValueDevice(
    key: FindingKey,
    device: ZHADevice
  ): TemplateResult {
    let icon: string;
    let iconClass = "";
    let value: string;

    if (key === "low_battery") {
      const level = this._readings.batteryLevel(device)!;
      icon = batteryLevelIconPath(level);
      iconClass = "warning";
      value = `${level}${blankBeforePercent(this.hass.locale)}%`;
    } else if (key === "firmware_update") {
      const update = this._readings.firmwareUpdate(device)!;
      icon = mdiPackageUp;
      value = [update.installed, update.latest].filter(Boolean).join(" → ");
    } else {
      const band = signalBand(device);
      icon = BAND_ICON[band];
      iconClass = `signal ${band}`;
      value = `LQI ${device.lqi}`;
    }

    const parent =
      key === "weak_signal"
        ? this._parentByIeee(this._devices!)[device.ieee]
        : undefined;
    const details = [
      this._areaName(device),
      device.model,
      parent ? this._t("via_router", { router: parent }) : undefined,
    ].filter(Boolean);

    return html`
      <ha-list-item-button href=${`/config/zha/device/${device.ieee}`}>
        <ha-svg-icon
          slot="start"
          class=${iconClass}
          .path=${icon}
        ></ha-svg-icon>
        <span slot="headline">${this._deviceName(device)}</span>
        <span slot="supporting-text">${details.join(" · ")}</span>
        <span slot="end" class="value ${iconClass}">${value}</span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _sorted(devices: ZHADevice[]): ZHADevice[] {
    return sortByArea(devices, this._areaName, this._deviceName);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-content-gutter) var(--ha-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          max-width: var(--ha-content-width-narrow);
          margin: auto;
        }

        ha-card {
          overflow: hidden;
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }

        /* Snapshot card. The heading mirrors the status card of the ZHA
           dashboard page. */
        .status {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
        }

        .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .icon.success {
          --icon-color: var(--success-color);
        }

        .icon.error {
          --icon-color: var(--error-color);
        }

        .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .icon ha-svg-icon {
          color: var(--icon-color);
          width: 24px;
          height: 24px;
        }

        .status-text h2 {
          margin: 0;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .status-text p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .distribution {
          padding: 0 var(--ha-space-4) var(--ha-space-4);
        }

        .bar {
          display: flex;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          background-color: var(--divider-color);
        }

        .segment {
          min-width: 6px;
        }

        .segment.strong,
        .dot.strong {
          background-color: var(--success-color);
        }

        .segment.fair,
        .dot.fair {
          background-color: var(--info-color);
        }

        .segment.weak,
        .dot.weak {
          background-color: var(--warning-color);
        }

        .segment.offline,
        .dot.offline {
          background-color: var(--disabled-color);
        }

        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-1) var(--ha-space-4);
          margin-top: var(--ha-space-2);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .snapshot {
          padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-4);
          border-top: 1px solid var(--divider-color);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: 1.4;
        }

        .snapshot p {
          margin: 0;
        }

        .snapshot .updated {
          margin-top: var(--ha-space-1);
        }

        /* Needs attention / worth a look */
        .card-title {
          margin: 0;
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-normal);
        }

        .finding {
          display: flex;
          gap: var(--ha-space-4);
          padding: var(--ha-space-2) var(--ha-space-4) 0;
          color: var(--secondary-text-color);
        }

        .finding ha-svg-icon {
          color: var(--error-color);
          flex-shrink: 0;
        }

        .finding h3 {
          margin: 0;
          color: var(--primary-text-color);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }

        .finding p {
          margin: var(--ha-space-1) 0 0;
          font-size: var(--ha-font-size-s);
          line-height: 1.4;
        }

        .all-good {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
          color: var(--secondary-text-color);
        }

        .all-good ha-svg-icon {
          color: var(--success-color);
        }

        .advice {
          margin: 0;
          padding: var(--ha-space-4);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: 1.4;
        }

        .muted {
          color: var(--secondary-text-color);
        }

        .value {
          color: var(--secondary-text-color);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .signal.strong {
          color: var(--success-color);
        }

        .signal.fair {
          color: var(--info-color);
        }

        .signal.weak,
        .warning {
          color: var(--warning-color);
        }

        .signal.unknown {
          color: var(--disabled-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-health-page": ZHANetworkHealthPage;
  }
}
