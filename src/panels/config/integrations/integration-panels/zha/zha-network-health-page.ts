import {
  mdiBatteryAlertVariantOutline,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiHelpCircleOutline,
  mdiPackageUp,
  mdiSignalCellular1,
  mdiSignalCellular2,
  mdiSignalCellular3,
  mdiSignalCellularOutline,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { stringCompare } from "../../../../../common/string/compare";
import { batteryLevelIconPath } from "../../../../../common/entity/battery_icon";
import { blankBeforePercent } from "../../../../../common/translations/blank_before_percent";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-relative-time";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-state-icon";
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
  devicesWithEntities,
  findings,
  lastSeenAt,
  linkQuality,
  managedDevices,
  neighborLinkQualities,
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

const FINDING_ICON: Partial<Record<FindingKey, string>> = {
  weak_signal: mdiSignalCellular1,
  low_battery: mdiBatteryAlertVariantOutline,
  firmware_update: mdiPackageUp,
};

/** Domains whose icon tells what a device is, most telling first. */
const PRIMARY_DOMAINS = [
  "light",
  "switch",
  "cover",
  "climate",
  "lock",
  "fan",
  "binary_sensor",
  "sensor",
];

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

  /**
   * Built from the full device list: the coordinator is the parent of many
   * devices, so its neighbour table counts too.
   */
  private _links = memoizeOne(neighborLinkQualities);

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
    isDisabled: (device) =>
      Boolean(this.hass.devices[device.device_reg_id]?.disabled_by),
    hasRegisteredEntities: (device) =>
      this._devicesWithEntities(this.hass.entities).has(device.device_reg_id),
  };

  private _devicesWithEntities = memoizeOne(devicesWithEntities);

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
    const found = findings(devices, this._readings, this._links(this._devices));

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
    const counts = countBands(devices, this._links(this._devices!));
    const rated = counts.strong + counts.fair + counts.weak + counts.offline;

    return html`
      <ha-card>
        <div class="card-body">
          <h2 class="card-title">${this._t("network_title")}</h2>
          <p class="description">${this._t("snapshot")}</p>
          ${
            rated
              ? html`
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
                `
              : nothing
          }
          <p class="updated">
            <ha-svg-icon .path=${mdiClockOutline}></ha-svg-icon>
            <span>
              ${this._t("updated")}
              <ha-relative-time .datetime=${this._updatedAt}></ha-relative-time>
            </span>
          </p>
        </div>
      </ha-card>
    `;
  }

  private _renderAttentionCard(found: Record<FindingKey, ZHADevice[]>) {
    const count = attentionCount(found);
    // One row per device: an offline device whose setup did not finish is
    // listed as offline, the more pressing of the two.
    const rows = new Map<string, { key: FindingKey; device: ZHADevice }>();
    for (const key of NEEDS_ATTENTION) {
      for (const device of found[key]) {
        if (!rows.has(device.ieee)) {
          rows.set(device.ieee, { key, device });
        }
      }
    }
    const sorted = this._sorted([...rows.values()].map((row) => row.device));

    return html`
      <ha-card>
        <h2 class="card-title header">
          ${
            count
              ? this._t("attention_title", { count })
              : this._t("nothing_needs_attention")
          }
        </h2>
        ${
          count
            ? html`
                <ha-list-nav
                  .ariaLabel=${this._t("attention_title", { count })}
                >
                  ${sorted.map((device) =>
                    this._renderAttentionDevice(
                      rows.get(device.ieee)!.key,
                      device
                    )
                  )}
                </ha-list-nav>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  /** The entity that best stands for the device, for its icon. */
  private _primaryState(device: ZHADevice): HassEntity | undefined {
    const states = device.entities
      // Configuration and diagnostic entities, such as a child lock switch,
      // say nothing about what the device is.
      .filter(
        (entity) =>
          entity.entity_id &&
          !this.hass.entities[entity.entity_id]?.entity_category
      )
      .map((entity) => this.hass.states[entity.entity_id!])
      .filter((stateObj): stateObj is HassEntity => stateObj !== undefined);
    for (const domain of PRIMARY_DOMAINS) {
      const match = states.find((stateObj) =>
        stateObj.entity_id.startsWith(`${domain}.`)
      );
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  private _renderAttentionDevice(
    key: FindingKey,
    device: ZHADevice
  ): TemplateResult {
    const stateObj = this._primaryState(device);
    const power = powerSource(device);
    const seen = lastSeenAt(device);
    const created = this.hass.devices[device.device_reg_id]?.created_at;
    const details =
      key === "offline"
        ? [
            // A mains device that is offline is often just switched off at
            // the wall.
            power ? this._t(`power_${power}`) : undefined,
            this._areaName(device),
            seen
              ? this._t("last_seen", {
                  time: relativeTime(seen, this.hass.locale),
                })
              : undefined,
          ]
        : [
            this._areaName(device),
            created
              ? this._t("joined", {
                  time: relativeTime(
                    new Date(created * 1000),
                    this.hass.locale
                  ),
                })
              : undefined,
          ];

    return html`
      <ha-list-item-button href=${`/config/zha/device/${device.ieee}`}>
        ${
          stateObj
            ? html`<ha-state-icon
                slot="start"
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-state-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiHelpCircleOutline}
              ></ha-svg-icon>`
        }
        <span slot="headline">${this._deviceName(device)}</span>
        <span slot="supporting-text">
          <span class="status">${this._t(key)}</span>${details
            .filter(Boolean)
            .map((detail) => ` · ${detail}`)}
        </span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderWorthALookCard(found: Record<FindingKey, ZHADevice[]>) {
    const keys = WORTH_A_LOOK.filter((key) => found[key].length);
    // Kept when empty, so it is clear that signal, batteries and firmware
    // were checked rather than left out.
    if (!keys.length) {
      return html`
        <ha-card>
          <h2 class="card-title header">${this._t("worth_a_look")}</h2>
          <p class="all-fine">
            <ha-svg-icon .path=${mdiCheckCircleOutline}></ha-svg-icon>
            ${this._t("worth_a_look_nothing")}
          </p>
        </ha-card>
      `;
    }
    return html`
      <ha-card>
        <h2 class="card-title header">${this._t("worth_a_look")}</h2>
        <ha-list-nav .ariaLabel=${this._t("worth_a_look")}>
          ${keys.map(
            (key) => html`
              <ha-list-item-button href=${`${BASE_PATH}/${key}`}>
                <ha-svg-icon
                  slot="start"
                  .path=${FINDING_ICON[key]}
                ></ha-svg-icon>
                <span slot="headline">
                  ${this._t(`${key}_count`, { count: found[key].length })}
                </span>
                <span slot="supporting-text">${this._t(`${key}_advice`)}</span>
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
      const links = this._links(this._devices!);
      const band = signalBand(device, links);
      icon = BAND_ICON[band];
      iconClass = `signal ${band}`;
      value = `LQI ${linkQuality(device, links) ?? "—"}`;
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
    return sortByArea(devices, this._areaName, this._deviceName, (a, b) =>
      stringCompare(a, b, this.hass.locale.language)
    );
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

        .card-title {
          margin: 0;
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .card-title.header {
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        }

        /* Snapshot card */
        .card-body {
          padding: var(--ha-space-4);
        }

        .description {
          margin: var(--ha-space-2) 0 var(--ha-space-4);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          line-height: 1.5;
        }

        .bar {
          display: flex;
          gap: 2px;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }

        .segment {
          min-width: 6px;
        }

        .segment.strong,
        .dot.strong {
          background-color: var(--success-color);
        }

        /* A lighter shade of strong: fair is fine, just not as robust. */
        .segment.fair,
        .dot.fair {
          background-color: color-mix(in srgb, var(--success-color) 45%, white);
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
          font-size: var(--ha-font-size-m);
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

        .updated {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          margin: var(--ha-space-4) 0 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
        }

        .updated ha-svg-icon {
          --mdc-icon-size: 18px;
        }

        /* Device lists */
        ha-state-icon[slot="start"],
        ha-svg-icon[slot="start"] {
          color: var(--secondary-text-color);
        }

        .all-fine {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          margin: 0;
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
          color: var(--secondary-text-color);
        }

        .all-fine ha-svg-icon {
          color: var(--success-color);
        }

        .status {
          color: var(--error-color);
        }

        .advice {
          margin: 0;
          padding: var(--ha-space-4);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: 1.4;
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
          color: color-mix(in srgb, var(--success-color) 45%, white);
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
