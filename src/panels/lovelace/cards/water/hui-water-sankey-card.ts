import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  getEnergyDataCollection,
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
import type { WaterSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { formatNumber } from "../../../../common/number/format_number";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  fireSankeyNodeMoreInfo,
  MIN_SANKEY_THRESHOLD_FACTOR,
} from "../energy/common/sankey";

const DEFAULT_CONFIG: Partial<WaterSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-water-sankey-card")
class HuiWaterSankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: WaterSankeyCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): WaterSankeyCardConfig {
    return {
      type: "water-sankey",
      layout: "auto",
      ...DEFAULT_CONFIG,
    };
  }

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: WaterSankeyCardConfig): void {
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
    const waterSources = prefs.energy_sources.filter(
      (source) => source.type === "water"
    );

    const computedStyle = getComputedStyle(this);

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Sum only top-level devices. Devices with `included_in_stat` are already
    // counted inside their parent stat; adding them again would double-count
    // and push the home total above the source meter.
    const totalDownstreamConsumption = prefs.device_consumption_water.reduce(
      (total, device) => {
        if (device.included_in_stat) {
          return total;
        }
        const value =
          device.stat_consumption in this._data!.stats
            ? calculateStatisticSumGrowth(
                this._data!.stats[device.stat_consumption]
              ) || 0
            : 0;
        return total + value;
      },
      0
    );
    const totalSourceSupply = waterSources.reduce((total, source) => {
      const value =
        source.stat_energy_from in this._data!.stats
          ? calculateStatisticSumGrowth(
              this._data!.stats[source.stat_energy_from]
            ) || 0
          : 0;
      return total + value;
    }, 0);
    const totalWaterConsumption = Math.max(
      totalDownstreamConsumption,
      totalSourceSupply
    );

    // Create home/consumption node
    const homeNode: Node = {
      id: "home",
      label: this.hass.config.location_name,
      value: Math.max(0, totalWaterConsumption),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const minWaterThreshold = homeNode.value * MIN_SANKEY_THRESHOLD_FACTOR;

    // Add water source nodes
    const waterColor = computedStyle
      .getPropertyValue("--energy-water-color")
      .trim();
    waterSources.forEach((source) => {
      if (source.type !== "water") {
        return;
      }
      const value =
        source.stat_energy_from in this._data!.stats
          ? calculateStatisticSumGrowth(
              this._data!.stats[source.stat_energy_from]
            ) || 0
          : 0;

      if (value <= 0) {
        return;
      }

      nodes.push({
        id: `source-${source.stat_energy_from}`,
        label:
          source.name ||
          getStatisticLabel(
            this.hass,
            source.stat_energy_from,
            this._data!.statsMetadata[source.stat_energy_from]
          ),
        value,
        color: waterColor,
        index: 0,
      });

      links.push({
        source: `source-${source.stat_energy_from}`,
        target: "home",
        value,
      });
    });

    const deviceValue = (statConsumption: string) =>
      statConsumption in this._data!.stats
        ? calculateStatisticSumGrowth(this._data!.stats[statConsumption]) || 0
        : 0;

    const deviceLabels = computeEnergyDeviceLabels(
      this.hass,
      prefs.device_consumption_water,
      this._data!.statsMetadata
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
      devices: prefs.device_consumption_water,
      computedStyle,
      localize: this.hass.localize,
      rootNodeId: "home",
      minThreshold: minWaterThreshold,
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
    `${formatNumber(value, this.hass.locale, value < 0.1 ? { maximumFractionDigits: 3 } : undefined)} ${this._data!.waterUnit}`;

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
    "hui-water-sankey-card": HuiWaterSankeyCard;
  }
}
