import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  computeConsumptionData,
  computeEnergyDeviceLabels,
  energySourcesByType,
  getEnergyDataCollection,
  getSummedData,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { EnergySankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { formatNumber } from "../../../../common/number/format_number";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  DEFAULT_MAX_SANKEY_DEVICES,
  fireSankeyNodeMoreInfo,
  MIN_SANKEY_THRESHOLD_FACTOR,
} from "./common/sankey";

const DEFAULT_CONFIG: Partial<EnergySankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-energy-sankey-card")
class HuiEnergySankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: EnergySankeyCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergySankeyCardConfig {
    return {
      type: "energy-sankey",
      layout: "auto",
      ...DEFAULT_CONFIG,
    };
  }

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: EnergySankeyCardConfig): void {
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
    return (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_isMobileSize")
    );
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
    const types = energySourcesByType(prefs);
    const { summedData, compareSummedData: _ } = getSummedData(this._data);
    const { consumption, compareConsumption: __ } = computeConsumptionData(
      summedData,
      undefined
    );

    const computedStyle = getComputedStyle(this);

    const nodes: Node[] = [];
    const links: Link[] = [];

    // The EV is its own consumer next to home, not a device inside it.
    const hasEv = types.ev !== undefined;
    const evConsumption = Math.max(0, consumption.total.used_ev);

    const homeNode: Node = {
      id: "home",
      label: this.hass.config.location_name,
      value: Math.max(0, consumption.total.used_home),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    if (hasEv) {
      nodes.push({
        id: "ev",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.ev"
        ),
        value: evConsumption,
        color: computedStyle.getPropertyValue("--energy-ev-color").trim(),
        index: 1,
      });
    }

    // Threshold is based on total consumption so it stays stable regardless of
    // how much of it the EV took.
    const minEnergyThreshold =
      Math.max(0, consumption.total.used_total) * MIN_SANKEY_THRESHOLD_FACTOR;

    if (types.battery) {
      const totalBatteryOut = summedData.total.from_battery ?? 0;
      const totalBatteryIn = summedData.total.to_battery ?? 0;

      // Add battery source
      nodes.push({
        id: "battery",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: totalBatteryOut,
        color: computedStyle
          .getPropertyValue("--energy-battery-out-color")
          .trim(),
        index: 0,
      });
      links.push({
        source: "battery",
        target: "home",
        value: consumption.total.used_battery,
      });
      if (hasEv && consumption.total.ev_battery > 0) {
        links.push({
          source: "battery",
          target: "ev",
          value: consumption.total.ev_battery,
        });
      }

      // Add battery sink
      nodes.push({
        id: "battery_in",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: totalBatteryIn,
        color: computedStyle
          .getPropertyValue("--energy-battery-in-color")
          .trim(),
        index: 1,
      });
      if (consumption.total.grid_to_battery > 0) {
        links.push({
          source: "grid",
          target: "battery_in",
          value: consumption.total.grid_to_battery,
        });
      }
      if (consumption.total.solar_to_battery > 0) {
        links.push({
          source: "solar",
          target: "battery_in",
          value: consumption.total.solar_to_battery,
        });
      }
    }

    if (types.grid) {
      const totalFromGrid = summedData.total.from_grid ?? 0;

      nodes.push({
        id: "grid",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: totalFromGrid,
        color: computedStyle
          .getPropertyValue("--energy-grid-consumption-color")
          .trim(),
        index: 0,
      });

      links.push({
        source: "grid",
        target: "home",
        value: consumption.total.used_grid,
      });
      if (hasEv && consumption.total.ev_grid > 0) {
        links.push({
          source: "grid",
          target: "ev",
          value: consumption.total.ev_grid,
        });
      }
    }

    // Add solar if available
    if (types.solar) {
      const totalSolarProduction = summedData.total.solar ?? 0;

      nodes.push({
        id: "solar",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: totalSolarProduction,
        color: computedStyle.getPropertyValue("--energy-solar-color").trim(),
        index: 0,
      });

      links.push({
        source: "solar",
        target: "home",
        value: consumption.total.used_solar,
      });
      if (hasEv && consumption.total.ev_solar > 0) {
        links.push({
          source: "solar",
          target: "ev",
          value: consumption.total.ev_solar,
        });
      }
    }

    // Add grid return if available
    if (types.grid && types.grid.some((g) => g.stat_energy_to)) {
      const totalToGrid = summedData.total.to_grid ?? 0;

      nodes.push({
        id: "grid_return",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: totalToGrid,
        color: computedStyle
          .getPropertyValue("--energy-grid-return-color")
          .trim(),
        index: 1,
      });
      if (consumption.total.battery_to_grid > 0) {
        links.push({
          source: "battery",
          target: "grid_return",
          value: consumption.total.battery_to_grid,
        });
      }
      if (consumption.total.solar_to_grid > 0) {
        links.push({
          source: "solar",
          target: "grid_return",
          value: consumption.total.solar_to_grid,
        });
      }
    }

    const deviceValue = (statConsumption: string) =>
      statConsumption in this._data!.stats
        ? calculateStatisticSumGrowth(this._data!.stats[statConsumption]) || 0
        : 0;

    const deviceLabels = computeEnergyDeviceLabels(
      this.hass,
      prefs.device_consumption,
      this._data.statsMetadata
    );

    const deviceLabel = (statConsumption: string) =>
      deviceLabels[statConsumption] ||
      getStatisticLabel(
        this.hass,
        statConsumption,
        this._data!.statsMetadata[statConsumption]
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
      minThreshold: minEnergyThreshold,
      maxDevices: this._config.max_devices ?? DEFAULT_MAX_SANKEY_DEVICES,
      untrackedFloor: 0,
      ceilOtherValue: false,
      initialUntracked: homeNode.value,
      getId: (device) => device.stat_consumption,
      getValue: deviceValue,
      getLabel: deviceLabel,
      getEntityId: (id) => (isExternalStatistic(id) ? undefined : id),
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
      untrackedFloor: 0,
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
                  "ui.panel.lovelace.cards.energy.no_data_period"
                )}`
          }
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    `${formatNumber(value, this.hass.locale, value < 0.1 ? { maximumFractionDigits: 3 } : undefined)} kWh`;

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    fireSankeyNodeMoreInfo(this, ev.detail.node);
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
    "hui-energy-sankey-card": HuiEnergySankeyCard;
  }
}
