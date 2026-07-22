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

    const homeNode: Node = {
      id: "home",
      label: this.hass.config.location_name,
      value: Math.max(0, consumption.total.used_total),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const minEnergyThreshold = homeNode.value * MIN_SANKEY_THRESHOLD_FACTOR;

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
    }

    // Add grid return if available
    if (types.grid && types.grid[0].stat_energy_to) {
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

    // Set of device stats that will be rendered as their own node
    const renderedStats = new Set<string>();
    prefs.device_consumption.forEach((device) => {
      if (deviceValue(device.stat_consumption) >= minEnergyThreshold) {
        renderedStats.add(device.stat_consumption);
      }
    });

    // Walk up the included_in_stat chain to the first ancestor that is rendered
    const deviceMap = new Map<string, string | undefined>();
    prefs.device_consumption.forEach((device) => {
      deviceMap.set(device.stat_consumption, device.included_in_stat);
    });
    const findEffectiveParent = (
      includedInStat: string | undefined
    ): string | undefined => {
      let currentParent = includedInStat;
      while (currentParent) {
        if (renderedStats.has(currentParent)) {
          return currentParent;
        }
        if (!deviceMap.has(currentParent)) {
          return undefined;
        }
        currentParent = deviceMap.get(currentParent);
      }
      return undefined;
    };

    const deviceLabel = (statConsumption: string, name?: string) =>
      name ||
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
      untrackedFloor: 0,
      ceilOtherValue: false,
      initialUntracked: homeNode.value,
      getId: (device) => device.stat_consumption,
      getValue: deviceValue,
      getLabel: deviceLabel,
      getEntityId: (id) => (isExternalStatistic(id) ? undefined : id),
      findEffectiveParent,
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
