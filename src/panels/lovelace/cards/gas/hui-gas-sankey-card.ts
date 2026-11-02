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
import type { GasSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { formatNumberWithUnit } from "../../../../common/number/format_number";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  DEFAULT_MAX_SANKEY_DEVICES,
  fireSankeyNodeMoreInfo,
  MIN_SANKEY_THRESHOLD_FACTOR,
} from "../energy/common/sankey";

const DEFAULT_CONFIG: Partial<GasSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-gas-sankey-card")
class HuiGasSankeyCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: GasSankeyCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): GasSankeyCardConfig {
    return {
      type: "gas-sankey",
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

  public setConfig(config: GasSankeyCardConfig): void {
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
    const gasSources = prefs.energy_sources.filter(
      (source) => source.type === "gas"
    );

    const computedStyle = getComputedStyle(this);

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Sum only top-level devices. Devices with `included_in_stat` are already
    // counted inside their parent stat; adding them again would double-count
    // and push the home total above the source meter.
    const usable = new Set(
      prefs.device_consumption_gas
        .filter((d) => deviceValue(d.stat_consumption) > 0)
        .map((d) => d.stat_consumption)
    );
    const devices = prefs.device_consumption_gas.map((d) =>
      d.included_in_stat && !usable.has(d.included_in_stat)
        ? { ...d, included_in_stat: undefined }
        : d
    );
    const totalDownstreamConsumption = devices.reduce(
      (total, d) =>
        d.included_in_stat ? total : total + deviceValue(d.stat_consumption),
      0
    );
    const totalSourceSupply = gasSources.reduce((total, source) => {
      const value =
        source.stat_energy_from in this._data!.stats
          ? calculateStatisticSumGrowth(
              this._data!.stats[source.stat_energy_from]
            ) || 0
          : 0;
      return total + value;
    }, 0);
    const totalGasConsumption = Math.max(
      totalDownstreamConsumption,
      totalSourceSupply
    );

    // Create home/consumption node
    const homeNode: Node = {
      id: "home",
      label: this._hassConfig.location_name,
      value: Math.max(0, totalGasConsumption),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const minGasThreshold = homeNode.value * MIN_SANKEY_THRESHOLD_FACTOR;

    // Add gas source nodes
    const gasColor = computedStyle
      .getPropertyValue("--energy-gas-color")
      .trim();
    gasSources.forEach((source) => {
      if (source.type !== "gas") {
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
        color: gasColor,
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
      prefs.device_consumption_gas,
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
      devices,
      computedStyle,
      localize: this._i18n.localize,
      rootNodeId: "home",
      minThreshold: minGasThreshold,
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

  private _valueFormatter = (value: number) => {
    const formatOptions =
      value < 0.1 ? { maximumFractionDigits: 3 } : undefined;
    return formatNumberWithUnit(
      value,
      this._data!.gasUnit,
      this._i18n.locale,
      formatOptions
    );
  };

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
    "hui-gas-sankey-card": HuiGasSankeyCard;
  }
}
