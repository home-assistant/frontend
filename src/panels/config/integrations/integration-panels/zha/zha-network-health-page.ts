import type { ContextType } from "@lit/context";
import {
  mdiBatteryAlertVariantOutline,
  mdiClockOutline,
  mdiHelpCircleOutline,
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
import { consume } from "../../../../../common/decorators/consume";
import { consumeEntityStates } from "../../../../../common/decorators/consume-context-entry";
import { batteryLevelIconPath } from "../../../../../common/entity/battery_icon";
import { formatNumberWithUnit } from "../../../../../common/number/format_number";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
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
import {
  apiContext,
  areasContext,
  devicesContext,
  fullEntitiesContext,
  internationalizationContext,
} from "../../../../../data/context";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { Route } from "../../../../../types";
import { getZHADeviceAreaName } from "./functions";
import type {
  AttentionKey,
  BandCounts,
  BarBand,
  DeviceReadings,
  Findings,
  SignalBand,
  WorthALookKey,
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

const FINDING_ICON: Record<WorthALookKey, string> = {
  weak_signal: mdiSignalCellular1,
  low_battery: mdiBatteryAlertVariantOutline,
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

/**
 * ZHA has no subscription for its device list, so link quality, last seen
 * and availability are fetched again at the same cadence as the ZHA device
 * page, so they do not freeze while the page is open.
 */
const DEVICE_REFRESH_INTERVAL = 60000;

const BASE_PATH = "/config/zha/network-health";

@customElement("zha-network-health-page")
class ZHANetworkHealthPage extends LitElement {
  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _haDevices!: ContextType<typeof devicesContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  /** The full registry, as the display registry leaves out disabled entities. */
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg?: EntityRegistryEntry[];

  @state() private _devices?: ZHADevice[];

  /**
   * The entities of all ZHA devices, whose states the page reads. Read by
   * consumeEntityStates through its path, hence not private.
   */
  @state() protected _entityIds: string[] = [];

  @state()
  @consumeEntityStates({ entityIdPath: ["_entityIds"] })
  private _states?: Record<string, HassEntity>;

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
    this._fetchDevices();
  }

  private async _loadDevices(): Promise<void> {
    const devices = await fetchDevices(this._api);
    this._devices = devices;
    this._entityIds = devices.flatMap((device) =>
      device.entities
        .map((entity) => entity.entity_id)
        .filter((entityId): entityId is string => Boolean(entityId))
    );
    this._updatedAt = new Date();
  }

  private async _fetchDevices(): Promise<void> {
    try {
      await this._loadDevices();
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
      await this._loadDevices();
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

  private _devicesWithEntities = memoizeOne(devicesWithEntities);

  private _entityRegById = memoizeOne(
    (entityReg: EntityRegistryEntry[]) =>
      new Map(entityReg.map((entry) => [entry.entity_id, entry]))
  );

  private _readings: DeviceReadings = {
    batteryLevel: (device) => {
      for (const entity of device.entities) {
        const stateObj = entity.entity_id
          ? this._states?.[entity.entity_id]
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
    isDisabled: (device) =>
      Boolean(this._haDevices[device.device_reg_id]?.disabled_by),
    hasRegisteredEntities: (device) =>
      this._devicesWithEntities(this._entityReg!).has(device.device_reg_id),
  };

  private _deviceName = (device: ZHADevice): string =>
    device.user_given_name || device.name;

  private _areaName = (device: ZHADevice): string | undefined =>
    getZHADeviceAreaName(device, this._areas, this._haDevices);

  /** The finding a subpage shows, taken from the path below the page. */
  private get _subpage(): WorthALookKey | undefined {
    const key = this.route?.path?.replace(/^\//, "").split("/")[0];
    return WORTH_A_LOOK.includes(key as WorthALookKey)
      ? (key as WorthALookKey)
      : undefined;
  }

  protected render(): TemplateResult {
    const subpage = this._subpage;
    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .header=${this._i18n.localize(
          subpage
            ? `ui.panel.config.zha.network_health.${subpage}`
            : "ui.panel.config.zha.network_health.title"
        )}
        .backPath=${subpage ? BASE_PATH : "/config/zha/dashboard"}
      >
        <div class="container">${this._renderContent(subpage)}</div>
      </hass-subpage>
    `;
  }

  private _renderContent(subpage?: WorthALookKey) {
    if (this._error) {
      return html`
        <ha-alert
          alert-type="error"
          .title=${this._i18n.localize(
            "ui.panel.config.zha.network_health.loading_error"
          )}
        >
          ${this._error}
        </ha-alert>
      `;
    }

    if (!this._devices || !this._entityReg) {
      return html`
        <div class="loading">
          <ha-spinner size="large"></ha-spinner>
        </div>
      `;
    }

    const devices = this._managedDevices(this._devices);
    const found = findings(devices, this._readings, this._links(this._devices));

    if (subpage) {
      // Grouped by room; within a room the worst reading stays first.
      return this._renderSubpage(
        subpage,
        this._sorted(found[subpage], { keepOrder: true })
      );
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
          <h2 class="card-title">
            ${this._i18n.localize(
              "ui.panel.config.zha.network_health.network_title"
            )}
          </h2>
          <p class="description">
            ${this._i18n.localize(
              "ui.panel.config.zha.network_health.snapshot"
            )}
          </p>
          ${
            rated
              ? html`
                  ${this._renderBar(counts)}
                  <div class="legend">
                    ${BAR_BANDS.filter((band) => counts[band]).map(
                      (band: BarBand) => html`
                        <span class="legend-item">
                          <span class="dot ${band}"></span>
                          ${this._i18n.localize(
                            `ui.panel.config.zha.network_health.signal_${band}`,
                            { count: counts[band] }
                          )}
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
              ${this._i18n.localize(
                "ui.panel.config.zha.network_health.updated"
              )}
              <ha-relative-time .datetime=${this._updatedAt}></ha-relative-time>
            </span>
          </p>
        </div>
      </ha-card>
    `;
  }

  private _renderAttentionCard(found: Findings) {
    const count = attentionCount(found);
    if (!count) {
      return nothing;
    }
    // One row per device: an offline device whose setup did not finish is
    // listed as offline, the more pressing of the two.
    const rows = new Map<string, { key: AttentionKey; device: ZHADevice }>();
    for (const key of NEEDS_ATTENTION) {
      for (const device of found[key]) {
        if (!rows.has(device.ieee)) {
          rows.set(device.ieee, { key, device });
        }
      }
    }
    const sorted = this._sorted([...rows.values()].map((row) => row.device));
    const title = this._i18n.localize(
      "ui.panel.config.zha.network_health.attention_title",
      { count }
    );

    return html`
      <ha-card>
        <h2 class="card-title header">${title}</h2>
        <ha-list-nav .ariaLabel=${title}>
          ${sorted.map((device) =>
            this._renderAttentionDevice(rows.get(device.ieee)!.key, device)
          )}
        </ha-list-nav>
      </ha-card>
    `;
  }

  /** The entity that best stands for the device, for its icon. */
  private _primaryState(device: ZHADevice): HassEntity | undefined {
    const entityReg = this._entityRegById(this._entityReg!);
    const states = device.entities
      // Configuration and diagnostic entities, such as a child lock switch,
      // say nothing about what the device is.
      .filter(
        (entity) =>
          entity.entity_id && !entityReg.get(entity.entity_id)?.entity_category
      )
      .map((entity) => this._states?.[entity.entity_id!])
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
    key: AttentionKey,
    device: ZHADevice
  ): TemplateResult {
    const localize = this._i18n.localize;
    const locale = this._i18n.locale;
    const stateObj = this._primaryState(device);
    const power = powerSource(device);
    const seen = lastSeenAt(device);
    const created = this._haDevices[device.device_reg_id]?.created_at;
    const details =
      key === "offline"
        ? [
            // A mains device that is offline is often just switched off at
            // the wall.
            power
              ? localize(`ui.panel.config.zha.network_health.power_${power}`)
              : undefined,
            this._areaName(device),
            seen
              ? localize("ui.panel.config.zha.network_health.last_seen", {
                  time: relativeTime(seen, locale),
                })
              : undefined,
          ]
        : [
            this._areaName(device),
            created
              ? localize("ui.panel.config.zha.network_health.joined", {
                  time: relativeTime(new Date(created * 1000), locale),
                })
              : undefined,
          ];

    return html`
      <ha-list-item-button href=${`/config/zha/device/${device.ieee}`}>
        ${
          stateObj
            ? html`<ha-state-icon
                slot="start"
                .stateObj=${stateObj}
              ></ha-state-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiHelpCircleOutline}
              ></ha-svg-icon>`
        }
        <span slot="headline">${this._deviceName(device)}</span>
        <span slot="supporting-text">
          <span class="status"
            >${localize(`ui.panel.config.zha.network_health.${key}`)}</span
          >${details.filter(Boolean).map((detail) => ` · ${detail}`)}
        </span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderWorthALookCard(found: Findings) {
    const keys = WORTH_A_LOOK.filter((key) => found[key].length);
    if (!keys.length) {
      return nothing;
    }
    const title = this._i18n.localize(
      "ui.panel.config.zha.network_health.worth_a_look"
    );
    return html`
      <ha-card>
        <h2 class="card-title header">${title}</h2>
        <ha-list-nav .ariaLabel=${title}>
          ${keys.map(
            (key) => html`
              <ha-list-item-button href=${`${BASE_PATH}/${key}`}>
                <ha-svg-icon
                  slot="start"
                  .path=${FINDING_ICON[key]}
                ></ha-svg-icon>
                <span slot="headline">
                  ${this._i18n.localize(
                    `ui.panel.config.zha.network_health.${key}_count`,
                    { count: found[key].length }
                  )}
                </span>
                <span slot="supporting-text">
                  ${this._i18n.localize(
                    `ui.panel.config.zha.network_health.${key}_advice`
                  )}
                </span>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>
            `
          )}
        </ha-list-nav>
      </ha-card>
    `;
  }

  private _renderSubpage(key: WorthALookKey, devices: ZHADevice[]) {
    const localize = this._i18n.localize;
    return html`
      <ha-card>
        ${
          devices.length
            ? html`
                <ha-list-nav
                  .ariaLabel=${localize(
                    `ui.panel.config.zha.network_health.${key}`
                  )}
                >
                  ${devices.map((device) =>
                    this._renderValueDevice(key, device)
                  )}
                </ha-list-nav>
              `
            : html`
                <ha-list-base>
                  <ha-list-item-base>
                    <span slot="headline">
                      ${localize("ui.panel.config.zha.network_health.no_devices")}
                    </span>
                  </ha-list-item-base>
                </ha-list-base>
              `
        }
        <div class="card-actions">
          <ha-button appearance="plain" href="/config/zha/visualization">
            ${localize("ui.panel.config.zha.network_health.show_map")}
          </ha-button>
        </div>
      </ha-card>
      <p class="tip">
        ${localize(`ui.panel.config.zha.network_health.${key}_tip`)}
      </p>
    `;
  }

  /** A device row with the value of its finding in front of the chevron. */
  private _renderValueDevice(
    key: WorthALookKey,
    device: ZHADevice
  ): TemplateResult {
    let icon: string;
    let iconClass: string;
    let value: string;

    if (key === "low_battery") {
      const level = this._readings.batteryLevel(device)!;
      icon = batteryLevelIconPath(level);
      iconClass = "warning";
      value = formatNumberWithUnit(level, "%", this._i18n.locale);
    } else {
      const links = this._links(this._devices!);
      const band = signalBand(device, links);
      const lqi = linkQuality(device, links);
      icon = BAND_ICON[band];
      iconClass = `signal ${band}`;
      value = `${this._i18n.localize("ui.panel.config.zha.neighbors.lqi")} ${
        lqi === null ? "—" : formatNumberWithUnit(lqi, null, this._i18n.locale)
      }`;
    }

    const parent =
      key === "weak_signal"
        ? this._parentByIeee(this._devices!)[device.ieee]
        : undefined;
    const details = [
      this._areaName(device),
      device.model,
      parent
        ? this._i18n.localize("ui.panel.config.zha.network_health.via_router", {
            router: parent,
          })
        : undefined,
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
        <span slot="end" class="value">${value}</span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _sorted(
    devices: ZHADevice[],
    { keepOrder = false } = {}
  ): ZHADevice[] {
    return sortByArea(
      devices,
      this._areaName,
      keepOrder ? null : this._deviceName,
      (a, b) => stringCompare(a, b, this._i18n.language)
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
          line-height: var(--ha-line-height-normal);
        }

        .bar {
          display: flex;
          gap: 2px;
          height: var(--ha-space-2);
          border-radius: var(--ha-border-radius-sm);
          overflow: hidden;
        }

        .segment {
          min-width: var(--ha-space-2);
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
          width: var(--ha-space-2);
          height: var(--ha-space-2);
          border-radius: var(--ha-border-radius-circle);
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

        .status {
          color: var(--error-color);
        }

        .tip {
          margin: 0;
          padding: 0 var(--ha-space-4);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-normal);
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

        /* ha-svg-icon raises the specificity above the slot rule above. */
        .signal.weak,
        ha-svg-icon.warning {
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
