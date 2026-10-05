import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WaterSankeyCardConfig } from "../types";
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
} from "../energy/common/sankey";

const DEFAULT_CONFIG: Partial<WaterSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-water-sankey-card")
class HuiWaterSankeyCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

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

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: HomeAssistantRegistries;

  // Not @state: labels and area grouping refresh with _data, not per state.
  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public setConfig(config: WaterSankeyCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = { ...DEFAULT_CONFIG, ...config };
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

  protected render() {
    if (!this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this._i18n.localize("ui.panel.lovelace.cards.energy.loading")}`;
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
      label: this._hassConfig.location_name,
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
            this._states,
            this._formatEntityName,
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
      this._states,
      this._formatEntityName,
      prefs.device_consumption_water,
      this._data!.statsMetadata
    );

    const deviceLabel = (statConsumption: string) =>
      deviceLabels[statConsumption] ||
      getStatisticLabel(
        this._states,
        this._formatEntityName,
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
      localize: this._i18n.localize,
      rootNodeId: "home",
      minThreshold: minWaterThreshold,
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
      states: this._states,
      registries: this._registries,
      computedStyle,
      localize: this._i18n.localize,
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
                  .data=${{ nodes, links }}
                  .vertical=${vertical}
                  .showValues=${this._config.show_values === true}
                  .valueFormatter=${this._valueFormatter}
                  @node-click=${this._handleNodeClick}
                ></ha-sankey-chart>`
              : html`${this._i18n.localize(
                  "ui.panel.lovelace.cards.energy.no_data_period"
                )}`
          }
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    `${formatNumber(value, this._i18n.locale, value < 0.1 ? { maximumFractionDigits: 3 } : undefined)} ${this._data!.waterUnit}`;

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
