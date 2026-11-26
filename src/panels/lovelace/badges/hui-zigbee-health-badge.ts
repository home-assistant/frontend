import type { ContextType } from "@lit/context";
import { mdiZigbee } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import { consumeEntityStates } from "../../../common/decorators/consume-context-entry";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-badge";
import "../../../components/ha-svg-icon";
import {
  apiContext,
  devicesContext,
  fullEntitiesContext,
  internationalizationContext,
} from "../../../data/context";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { ZHADevice } from "../../../data/zha";
import { fetchDevices } from "../../../data/zha";
import type {
  DeviceReadings,
  HealthStatus,
} from "../../config/integrations/integration-panels/zha/network-health";
import {
  batteryLevel,
  deviceEntityIds,
  devicesWithEntities,
  findings,
  healthSummary,
  managedDevices,
  neighborLinkQualities,
} from "../../config/integrations/integration-panels/zha/network-health";
import { actionHandler } from "../common/directives/action-handler-directive";
import type { LovelaceBadge } from "../types";
import type { ZigbeeHealthBadgeConfig } from "./types";

/** Same cadence as the network health page, so both tell the same story. */
const DEVICE_REFRESH_INTERVAL = 60000;

const NETWORK_HEALTH_PATH = "/config/zha/network-health";

const STATUS_COLOR: Record<HealthStatus, string> = {
  attention: "var(--error-color)",
  worth_a_look: "var(--warning-color)",
  healthy: "var(--success-color)",
};

/**
 * Sums up the ZHA network health page in one badge. The ZHA device list is
 * admin only, so the badge renders nothing when it cannot be loaded.
 */
@customElement("hui-zigbee-health-badge")
export class HuiZigbeeHealthBadge extends LitElement implements LovelaceBadge {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api?: ContextType<typeof apiContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _haDevices?: ContextType<typeof devicesContext>;

  /** The full registry, as the display registry leaves out disabled entities. */
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg?: EntityRegistryEntry[];

  @state() private _config?: ZigbeeHealthBadgeConfig;

  @state() private _devices?: ZHADevice[];

  /**
   * The entities of all ZHA devices, whose states the badge reads. Read by
   * consumeEntityStates through its path, hence not private.
   */
  @state() protected _entityIds: string[] = [];

  @state()
  @consumeEntityStates({ entityIdPath: ["_entityIds"] })
  private _states?: Record<string, HassEntity>;

  private _refreshInterval?: number;

  public setConfig(config: ZigbeeHealthBadgeConfig): void {
    this._config = config;
  }

  protected firstUpdated(): void {
    this._loadDevices();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._loadDevices();
    }
    this._refreshInterval = window.setInterval(
      () => this._loadDevices(),
      DEVICE_REFRESH_INTERVAL
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._refreshInterval) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = undefined;
    }
  }

  private async _loadDevices(): Promise<void> {
    if (!this._api) {
      return;
    }
    try {
      const devices = await fetchDevices(this._api);
      this._devices = devices;
      this._entityIds = deviceEntityIds(devices);
    } catch (_err: unknown) {
      // Not an admin, or ZHA is not running: keep the last snapshot, or
      // render nothing when there is none.
    }
  }

  private _devicesWithEntities = memoizeOne(devicesWithEntities);

  private _links = memoizeOne(neighborLinkQualities);

  private _readings: DeviceReadings = {
    batteryLevel: (device) => batteryLevel(device, this._states),
    isDisabled: (device) =>
      Boolean(this._haDevices?.[device.device_reg_id]?.disabled_by),
    hasRegisteredEntities: (device) =>
      this._devicesWithEntities(this._entityReg ?? []).has(
        device.device_reg_id
      ),
  };

  private _handleAction(): void {
    navigate(NETWORK_HEALTH_PATH);
  }

  protected render() {
    if (!this._config || !this._i18n || !this._devices || !this._entityReg) {
      return nothing;
    }

    const found = findings(
      managedDevices(this._devices),
      this._readings,
      this._links(this._devices)
    );
    const summary = healthSummary(found);
    const localize = this._i18n.localize;
    const name = localize(
      "ui.panel.lovelace.strategy.maintenance.zigbee_health.name"
    );

    return html`
      <ha-badge
        type="button"
        .label=${name}
        .accessibleLabel=${name}
        style=${styleMap({ "--badge-color": STATUS_COLOR[summary.status] })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
      >
        <ha-svg-icon slot="icon" .path=${mdiZigbee}></ha-svg-icon>
        ${localize(
          `ui.panel.lovelace.strategy.maintenance.zigbee_health.${summary.status}`,
          { count: summary.count }
        )}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--success-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-zigbee-health-badge": HuiZigbeeHealthBadge;
  }
}
