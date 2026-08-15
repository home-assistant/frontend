import {
  mdiAlertCircleOutline,
  mdiBatteryAlertVariantOutline,
  mdiCheck,
  mdiClockOutline,
  mdiLanDisconnect,
  mdiProgressAlert,
  mdiRouterWireless,
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
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

/** Link quality below which a device sits at the edge of its radio range. */
const WEAK_LQI = 30;

/** Link quality from which a device is comfortably connected. */
const STRONG_LQI = 60;

/** Minutes without contact after which a device is listed as quiet. */
const QUIET_MINUTES = 90;

/** Battery percentage at or below which a device is listed as running low. */
const LOW_BATTERY = 20;

type Band = "strong" | "fair" | "weak" | "unknown";

const BAND_ICON: Record<Band, string> = {
  strong: mdiSignalCellular3,
  fair: mdiSignalCellular2,
  weak: mdiSignalCellular1,
  unknown: mdiSignalCellularOutline,
};

/**
 * The bar reports the state of every device, worsening from left to right. A
 * silent device gets its own band: its last link quality says nothing about
 * how it is doing now.
 */
type BarBand = "strong" | "fair" | "weak" | "offline";

const BANDS: BarBand[] = ["strong", "fair", "weak", "offline"];

interface HealthGroup {
  key: string;
  icon: string;
  devices: ZHADevice[];
  /** Show the battery level instead of the link quality on each row. */
  battery?: boolean;
}

@customElement("zha-network-health-page")
class ZHANetworkHealthPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _devices?: ZHADevice[];

  @state() private _error?: string;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchDevices();
    }
  }

  private async _fetchDevices(): Promise<void> {
    try {
      this._devices = await fetchDevices(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private get _managedDevices(): ZHADevice[] {
    return (this._devices ?? []).filter((device) => !device.active_coordinator);
  }

  private _minutesSince(lastSeen: string): number {
    return Math.round((Date.now() - new Date(lastSeen).getTime()) / 60000);
  }

  private _band(device: ZHADevice): Band {
    if (device.lqi === null || device.lqi === undefined) {
      return "unknown";
    }
    if (device.lqi < WEAK_LQI) {
      return "weak";
    }
    return device.lqi < STRONG_LQI ? "fair" : "strong";
  }

  private _countBands(
    devices: ZHADevice[]
  ): Record<BarBand | "unknown", number> {
    const counts: Record<BarBand | "unknown", number> = {
      strong: 0,
      fair: 0,
      weak: 0,
      offline: 0,
      unknown: 0,
    };
    for (const device of devices) {
      counts[device.available ? this._band(device) : "offline"]++;
    }
    return counts;
  }

  /**
   * A device that joined the network but never finished its interview: it is
   * known to the coordinator, yet exposes nothing to control or read.
   * `pairing_status` would say so directly, but it only travels with the
   * pairing events, not with the device list this page is built on.
   */
  private _isIncomplete(device: ZHADevice): boolean {
    return device.entities.length === 0;
  }

  /** Battery percentage reported by the device, if it has a battery sensor. */
  private _batteryLevel(device: ZHADevice): number | null {
    for (const entity of device.entities) {
      const stateObj = this.hass.states[entity.entity_id];
      if (stateObj?.attributes.device_class === "battery") {
        const level = Number(stateObj.state);
        if (!isNaN(level)) {
          return level;
        }
      }
    }
    return null;
  }

  /**
   * Map each device to the router that lists it as a child, so a weak device
   * can be traced to the neighbour it depends on. Built once per device list
   * rather than per rendered row.
   */
  private _parentByIeee = memoizeOne((devices: ZHADevice[]) => {
    const parents: Record<string, string> = {};
    for (const device of devices) {
      for (const neighbor of device.neighbors) {
        if (neighbor.relationship === "Child") {
          parents[neighbor.ieee] = device.user_given_name || device.name;
        }
      }
    }
    return parents;
  });

  private _areaName(device: ZHADevice): string {
    return device.area_id
      ? (this.hass.areas[device.area_id]?.name ?? device.area_id)
      : this.hass.localize("ui.panel.config.zha.network_health.no_area");
  }

  private get _groups(): HealthGroup[] {
    const devices = this._managedDevices;
    return [
      {
        key: "incomplete",
        icon: mdiProgressAlert,
        devices: devices.filter((device) => this._isIncomplete(device)),
      },
      {
        key: "weak_signal",
        icon: mdiSignalCellular1,
        devices: devices
          .filter((device) => this._band(device) === "weak")
          .sort((a, b) => a.lqi - b.lqi),
      },
      {
        key: "unreachable",
        icon: mdiLanDisconnect,
        devices: devices.filter((device) => !device.available),
      },
      {
        key: "low_battery",
        icon: mdiBatteryAlertVariantOutline,
        devices: devices
          .filter((device) => {
            const level = this._batteryLevel(device);
            return level !== null && level <= LOW_BATTERY;
          })
          .sort((a, b) => this._batteryLevel(a)! - this._batteryLevel(b)!),
        battery: true,
      },
      {
        key: "quiet",
        icon: mdiClockOutline,
        devices: devices.filter(
          (device) => this._minutesSince(device.last_seen) > QUIET_MINUTES
        ),
      },
      {
        key: "routers",
        icon: mdiRouterWireless,
        devices: devices.filter((device) => device.device_type === "Router"),
      },
    ];
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zha.network_health.title"
        )}
        back-path="/config/zha/dashboard"
      >
        <div class="container">${this._renderContent()}</div>
      </hass-subpage>
    `;
  }

  private _renderContent(): TemplateResult {
    if (this._error) {
      return html`
        <ha-alert
          alert-type="error"
          .title=${this.hass.localize(
            "ui.panel.config.zha.network_health.loading_error"
          )}
        >
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

    return html`${this._renderStatusCard()} ${this._renderGroupsCard()}`;
  }

  private _renderBar(
    counts: Record<BarBand | "unknown", number>
  ): TemplateResult {
    return html`
      <div class="bar">
        ${BANDS.map((band) =>
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

  private _renderStatusCard(): TemplateResult {
    const devices = this._managedDevices;
    const offline = devices.filter((device) => !device.available).length;
    const counts = this._countBands(devices);
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
            <h2>
              ${this.hass.localize(
                `ui.panel.config.zha.network_health.status_${online ? "online" : "offline"}`
              )}
            </h2>
            <p>
              ${
                offline
                  ? this.hass.localize(
                      "ui.panel.config.zha.network_health.some_unreachable",
                      { count: devices.length, offline }
                    )
                  : this.hass.localize(
                      "ui.panel.config.zha.network_health.all_reachable",
                      { count: devices.length }
                    )
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
                    ${BANDS.map(
                      (band) => html`
                        <span class="legend-item">
                          <span class="dot ${band}"></span>
                          ${this.hass.localize(
                            `ui.panel.config.zha.network_health.signal_${band}`,
                            { count: counts[band] }
                          )}
                        </span>
                      `
                    )}
                  </div>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderGroupsCard(): TemplateResult {
    return html`
      <ha-card>
        ${this._groups.map(
          (group) => html`
            <ha-expansion-panel
              left-chevron
              .noCollapse=${group.devices.length === 0}
              .header=${this.hass.localize(
                `ui.panel.config.zha.network_health.${group.key}`
              )}
              .secondary=${this.hass.localize(
                `ui.panel.config.zha.network_health.${group.key}_secondary`
              )}
            >
              <ha-svg-icon
                slot="leading-icon"
                .path=${group.icon}
              ></ha-svg-icon>
              <span slot="icons" class="count">${group.devices.length}</span>
              ${
                group.devices.length
                  ? html`
                      <p class="advice">
                        ${this.hass.localize(
                          `ui.panel.config.zha.network_health.${group.key}_advice`
                        )}
                      </p>
                      <ha-md-list> ${this._renderByArea(group)} </ha-md-list>
                    `
                  : nothing
              }
            </ha-expansion-panel>
          `
        )}
      </ha-card>
    `;
  }

  /**
   * Devices of a group, split by area so it is visible whether a finding is
   * spread over the house or concentrated in one room.
   */
  private _renderByArea(group: HealthGroup): TemplateResult[] {
    const byArea = new Map<string, { name: string; devices: ZHADevice[] }>();
    for (const device of group.devices) {
      const area = byArea.get(device.area_id ?? "");
      if (area) {
        area.devices.push(device);
      } else {
        byArea.set(device.area_id ?? "", {
          name: this._areaName(device),
          devices: [device],
        });
      }
    }

    return [...byArea.values()]
      .sort((a, b) =>
        a.devices.length === b.devices.length
          ? a.name.localeCompare(b.name)
          : b.devices.length - a.devices.length
      )
      .map(
        ({ name, devices }) => html`
          <div class="area-caption" role="separator">
            ${name} · ${devices.length}
          </div>
          ${devices.map((device) => this._renderDevice(device, group.battery))}
        `
      );
  }

  private _renderDevice(device: ZHADevice, battery = false): TemplateResult {
    const band = this._band(device);
    const level = battery ? this._batteryLevel(device) : null;
    const parent = this._parentByIeee(this._devices!)[device.ieee];
    // Nothing is measured while a device is silent, so what is shown is the
    // reading from the last contact.
    const stale = device.available ? "" : " stale";
    const details = [
      device.model,
      parent
        ? this.hass.localize("ui.panel.config.zha.network_health.via_router", {
            router: parent,
          })
        : undefined,
      relativeTime(new Date(device.last_seen), this.hass.locale),
    ].filter(Boolean);

    return html`
      <ha-md-list-item type="link" href=${`/config/zha/device/${device.ieee}`}>
        <ha-svg-icon
          slot="start"
          class=${(level === null ? `signal ${band}` : "battery") + stale}
          .path=${level === null ? BAND_ICON[band] : batteryLevelIconPath(level)}
        ></ha-svg-icon>
        <span slot="headline">${device.user_given_name || device.name}</span>
        <span slot="supporting-text">${details.join(" · ")}</span>
        <span
          slot="end"
          class=${(level === null ? `lqi ${band}` : "battery") + stale}
        >
          ${
            level !== null
              ? `${level}${blankBeforePercent(this.hass.locale)}%`
              : device.lqi === null || device.lqi === undefined
                ? "—"
                : `LQI ${device.lqi}`
          }
        </span>
      </ha-md-list-item>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          max-width: 700px;
          margin: auto;
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }

        /* Status */
        .status {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
        }

        /* Mirrors the status card of the ZHA dashboard page */
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

        /* Signal distribution, used by the status card and each area */
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

        /* Captions line up with the device names, the devices themselves with
           the group icon above them, so the nesting reads top down. */
        .area-caption {
          padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-1);
          padding-inline-start: calc(var(--ha-space-4) + 64px);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-medium);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Groups */
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 var(--ha-space-4);
        }

        /* Keep the leading icons aligned when no chevron is rendered, taking
           its place: a 24px icon followed by an 8px gap. */
        ha-expansion-panel[no-collapse] ha-svg-icon[slot="leading-icon"] {
          margin-inline-start: 32px;
        }

        ha-expansion-panel:not(:first-of-type) {
          border-top: 1px solid var(--divider-color);
        }

        .count {
          font-size: var(--ha-font-size-l);
          color: var(--secondary-text-color);
          font-variant-numeric: tabular-nums;
          min-width: 1.5em;
          text-align: end;
        }

        .count.weak {
          color: var(--warning-color);
        }

        .advice {
          margin: 0 var(--ha-space-4) var(--ha-space-2);
          margin-inline-start: calc(var(--ha-space-4) + 32px);
          padding-inline-start: var(--ha-space-3);
          border-inline-start: 2px solid var(--divider-color);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: 1.4;
        }

        ha-md-list {
          background: none;
          padding: 0;
          --md-list-item-top-space: var(--ha-space-1);
          --md-list-item-bottom-space: var(--ha-space-1);
          --md-list-item-leading-space: calc(var(--ha-space-4) + 32px);
          --md-list-item-trailing-space: var(--ha-space-4);
        }

        .signal.strong {
          color: var(--success-color);
        }

        .signal.fair {
          color: var(--info-color);
        }

        .signal.weak {
          color: var(--warning-color);
        }

        .signal.unknown {
          color: var(--disabled-text-color);
        }

        .lqi {
          font-variant-numeric: tabular-nums;
          color: var(--secondary-text-color);
        }

        .lqi.weak {
          color: var(--warning-color);
        }

        .battery {
          color: var(--warning-color);
          font-variant-numeric: tabular-nums;
        }

        /* A reading from the last contact, not a current one. */
        .signal.stale,
        .lqi.stale,
        .battery.stale {
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
