import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  computeConsumptionSingle,
  computeEnergyDeviceLabels,
  formatPowerShort,
  getEnergyDataCollection,
  getPowerFromState,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { PowerSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  fireSankeyNodeMoreInfo,
  MIN_SANKEY_THRESHOLD_FACTOR,
} from "./common/sankey";

const DEFAULT_CONFIG: Partial<PowerSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

interface PowerData {
  solar: number;
  from_grid: number;
  to_grid: number;
  from_battery: number;
  to_battery: number;
  grid_to_battery: number;
  battery_to_grid: number;
  solar_to_battery: number;
  solar_to_grid: number;
  // Home's net share of each source, i.e. with the EV's share deducted.
  used_solar: number;
  used_grid: number;
  used_battery: number;
  // The EV's share of each source. used_{solar,grid,battery} + ev_{solar,grid,battery}
  // reconstructs the original (pre-EV-split) source usage.
  ev_solar: number;
  ev_grid: number;
  ev_battery: number;
  used_total: number;
  used_home: number;
  used_ev: number;
}

@customElement("hui-power-sankey-card")
class HuiPowerSankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: PowerSankeyCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): PowerSankeyCardConfig {
    return {
      type: "power-sankey",
      layout: "auto",
      ...DEFAULT_CONFIG,
    };
  }

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: PowerSankeyCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
      }),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 5;
  }

  getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 6,
      rows: 6,
      min_rows: 2,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_isMobileSize")
    ) {
      return true;
    }

    // Check if any of the tracked entity states have changed
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || !this._entities.size) {
        return true;
      }

      // Only update if one of our tracked entities changed
      for (const entityId of this._entities) {
        if (oldHass.states[entityId] !== this.hass.states[entityId]) {
          return true;
        }
      }
    }

    return false;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    const prefs = this._data.prefs;
    const powerData = this._computePowerData(prefs);
    const computedStyle = getComputedStyle(this);

    // Calculate dynamic threshold based on total consumption
    const minPowerThreshold =
      Math.max(0, powerData.used_total) * MIN_SANKEY_THRESHOLD_FACTOR;

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Create home node. Home and EV are peers drawing from the same sources -
    // the EV's share of consumption is deducted here and given its own node
    // below, rather than nested under Home like a device.
    const homeNode: Node = {
      id: "home",
      label: this.hass.config.location_name,
      value: Math.max(0, powerData.used_home),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const hasEv = powerData.used_ev > 0;
    if (hasEv) {
      nodes.push({
        id: "ev",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.ev"
        ),
        value: powerData.used_ev,
        color: computedStyle.getPropertyValue("--energy-ev-color").trim(),
        index: 1,
      });
    }

    // Add battery source and sink if available
    if (powerData.from_battery > 0) {
      nodes.push({
        id: "battery",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.from_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-out-color")
          .trim(),
        index: 0,
      });
      links.push({
        source: "battery",
        target: "home",
        value: powerData.used_battery,
      });
      if (hasEv && powerData.ev_battery > 0) {
        links.push({
          source: "battery",
          target: "ev",
          value: powerData.ev_battery,
        });
      }
    }

    if (powerData.to_battery > 0) {
      nodes.push({
        id: "battery_in",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.to_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-in-color")
          .trim(),
        index: 1,
      });
      if (powerData.grid_to_battery > 0) {
        links.push({
          source: "grid",
          target: "battery_in",
          value: powerData.grid_to_battery,
        });
      }
      if (powerData.solar_to_battery > 0) {
        links.push({
          source: "solar",
          target: "battery_in",
          value: powerData.solar_to_battery,
        });
      }
    }

    // Add grid source if available
    if (powerData.from_grid > 0) {
      nodes.push({
        id: "grid",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.from_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-consumption-color")
          .trim(),
        index: 0,
      });
      links.push({
        source: "grid",
        target: "home",
        value: powerData.used_grid,
      });
      if (hasEv && powerData.ev_grid > 0) {
        links.push({
          source: "grid",
          target: "ev",
          value: powerData.ev_grid,
        });
      }
    }

    // Add solar if available
    if (powerData.solar > 0) {
      nodes.push({
        id: "solar",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: powerData.solar,
        color: computedStyle.getPropertyValue("--energy-solar-color").trim(),
        index: 0,
      });
      links.push({
        source: "solar",
        target: "home",
        value: powerData.used_solar,
      });
      if (hasEv && powerData.ev_solar > 0) {
        links.push({
          source: "solar",
          target: "ev",
          value: powerData.ev_solar,
        });
      }
    }

    // Add grid return if available
    if (powerData.to_grid > 0) {
      nodes.push({
        id: "grid_return",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.to_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-return-color")
          .trim(),
        index: 1,
      });
      if (powerData.battery_to_grid > 0) {
        links.push({
          source: "battery",
          target: "grid_return",
          value: powerData.battery_to_grid,
        });
      }
      if (powerData.solar_to_grid > 0) {
        links.push({
          source: "solar",
          target: "grid_return",
          value: powerData.solar_to_grid,
        });
      }
    }

    const deviceLabels = computeEnergyDeviceLabels(
      this.hass,
      prefs.device_consumption,
      this._data.statsMetadata,
      "stat_rate"
    );

    const {
      deviceNodes,
      parentLinks,
      links: deviceLinks,
      untrackedConsumption,
    } = buildSankeyDeviceNodes({
      devices: prefs.device_consumption,
      computedStyle,
      localize: this.hass.localize,
      rootNodeId: "home",
      minThreshold: minPowerThreshold,
      untrackedFloor: 1,
      ceilOtherValue: true,
      initialUntracked: homeNode.value,
      getId: (device) => device.stat_rate,
      getValue: (id) => this._getCurrentPower(id),
      getLabel: (id) => deviceLabels[id] || this._getEntityLabel(id),
      getEntityId: (id) => id,
    });
    links.push(...deviceLinks);

    const { group_by_area, group_by_floor } = this._config;
    const layout = buildSankeyLayout({
      hass: this.hass,
      computedStyle,
      localize: this.hass.localize,
      deviceNodes,
      parentLinks,
      rootNodeId: "home",
      groupByFloor: !!group_by_floor,
      groupByArea: !!group_by_area,
      untrackedConsumption,
      untrackedFloor: 1,
    });
    nodes.push(...layout.nodes);
    links.push(...layout.links);

    const hasData = nodes.some((node) => node.value > 0);

    const vertical =
      this._config.layout === "vertical" ||
      (this._config.layout !== "horizontal" && this._isMobileSize);

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "is-grid": this.layout === "grid",
          "is-panel": this.layout === "panel",
          "is-vertical": vertical,
        })}
      >
        <div class="card-content">
          ${
            hasData
              ? html`<ha-sankey-chart
                  .hass=${this.hass}
                  .data=${{ nodes, links }}
                  .vertical=${vertical}
                  .valueFormatter=${this._valueFormatter}
                  @node-click=${this._handleNodeClick}
                ></ha-sankey-chart>`
              : html`${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.no_data"
                )}`
          }
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    formatPowerShort(this.hass, value);

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    fireSankeyNodeMoreInfo(this, ev.detail.node);
  }

  /**
   * Compute real-time power data from current entity states.
   * Similar to computeConsumptionData but for instantaneous power.
   */
  private _computePowerData(prefs: EnergyPreferences): PowerData {
    // Clear tracked entities and rebuild the set
    this._entities.clear();

    let solar = 0;
    let from_grid = 0;
    let to_grid = 0;
    let from_battery = 0;
    let to_battery = 0;
    let ev = 0;

    // Collect solar power
    prefs.energy_sources
      .filter((source) => source.type === "solar")
      .forEach((source) => {
        if (source.type === "solar" && source.stat_rate) {
          const value = this._getCurrentPower(source.stat_rate);
          if (value > 0) {
            solar += value;
          }
        }
      });

    // Collect grid power (positive = import, negative = export)
    prefs.energy_sources
      .filter((source) => source.type === "grid")
      .forEach((source) => {
        if (source.type === "grid" && source.stat_rate) {
          const value = this._getCurrentPower(source.stat_rate);
          if (value > 0) {
            from_grid += value;
          } else if (value < 0) {
            to_grid += Math.abs(value);
          }
        }
      });

    // Collect battery power (positive = discharge, negative = charge)
    // Sum all battery values first, then determine net direction.
    // Momentary power should only flow in one direction across all batteries.
    let net_battery = 0;
    prefs.energy_sources
      .filter((source) => source.type === "battery")
      .forEach((source) => {
        if (source.type === "battery" && source.stat_rate) {
          net_battery += this._getCurrentPower(source.stat_rate);
        }
      });
    if (net_battery > 0) {
      from_battery = net_battery;
    } else if (net_battery < 0) {
      to_battery = Math.abs(net_battery);
    }

    // Collect EV power draw
    prefs.energy_sources
      .filter((source) => source.type === "ev")
      .forEach((source) => {
        if (source.type === "ev" && source.stat_rate) {
          const value = this._getCurrentPower(source.stat_rate);
          if (value > 0) {
            ev += value;
          }
        }
      });

    // Reuse the same source-priority waterfall and home/EV split used for
    // historical consumption data (see computeConsumptionSingle) - the maths
    // are unit-agnostic, so it applies to instantaneous power just as well.
    const consumption = computeConsumptionSingle({
      from_grid,
      to_grid,
      solar,
      to_battery,
      from_battery,
      ev,
    });

    return {
      solar,
      from_grid,
      to_grid,
      from_battery,
      to_battery,
      ...consumption,
    };
  }

  /**
   * Get current power value from entity state, normalized to watts (W)
   * @param entityId - The entity ID to get power value from
   * @returns Power value in W, or 0 if entity not found or invalid
   */
  private _getCurrentPower(entityId: string): number {
    // Track this entity for state change detection
    this._entities.add(entityId);

    // getPowerFromState returns power in W
    return getPowerFromState(this.hass.states[entityId]) ?? 0;
  }

  /**
   * Get entity label (friendly name or entity ID)
   * @param entityId - The entity ID to get label for
   * @returns Friendly name if available, otherwise the entity ID
   */
  private _getEntityLabel(entityId: string): string {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return entityId;
    }
    return stateObj.attributes.friendly_name || entityId;
  }

  static styles = css`
    ha-card {
      height: 400px;
      display: flex;
      flex-direction: column;
      --chart-max-height: none;
    }
    ha-card.is-vertical {
      height: 500px;
    }
    ha-card.is-grid,
    ha-card.is-panel {
      height: 100%;
    }
    .card-content {
      flex: 1;
      display: flex;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-sankey-card": HuiPowerSankeyCard;
  }
}
