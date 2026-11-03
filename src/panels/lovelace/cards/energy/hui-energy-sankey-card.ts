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
  uiContext,
} from "../../../../data/context";
import type {
  EnergyConsumptionData,
  EnergyData,
  EnergySourceByType,
} from "../../../../data/energy";
import {
  computeConsumptionData,
  computeEnergyDeviceLabels,
  energySourcesByType,
  getSummedData,
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
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { EnergySankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { formatNumberWithUnit } from "../../../../common/number/format_number";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import { getEnergyColor } from "./common/color";
import type { SankeyFlowShare } from "./common/sankey";
import {
  addSplitSankeyLinks,
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
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

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

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean>({
    transformer: ({ themes }) => themes.darkMode,
  })
  private _darkMode!: boolean;

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

  public setConfig(config: EnergySankeyCardConfig): void {
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
      label: types.home?.[0]?.name || this._hassConfig.location_name,
      value: Math.max(0, consumption.total.used_total),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const minEnergyThreshold = homeNode.value * MIN_SANKEY_THRESHOLD_FACTOR;

    const combine =
      this._config.combine_sources ?? this._data.combineSources ?? true;
    if (!combine) {
      const separate = this._computeSeparateSources(
        types,
        consumption,
        summedData.timestamps,
        computedStyle
      );
      nodes.push(...separate.nodes);
      links.push(...separate.links);
    }

    if (combine && types.battery) {
      const totalBatteryOut = summedData.total.from_battery ?? 0;
      const totalBatteryIn = summedData.total.to_battery ?? 0;

      // Add battery source
      nodes.push({
        id: "battery",
        label: this._i18n.localize(
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
        label: this._i18n.localize(
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

    if (combine && types.grid) {
      const totalFromGrid = summedData.total.from_grid ?? 0;

      nodes.push({
        id: "grid",
        label: this._i18n.localize(
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
    if (combine && types.solar) {
      const totalSolarProduction = summedData.total.solar ?? 0;

      nodes.push({
        id: "solar",
        label: this._i18n.localize(
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
    if (combine && types.grid && types.grid.some((g) => g.stat_energy_to)) {
      const totalToGrid = summedData.total.to_grid ?? 0;

      nodes.push({
        id: "grid_return",
        label: this._i18n.localize(
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
      this._states,
      this._formatEntityName,
      prefs.device_consumption,
      this._data.statsMetadata
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
      devices: prefs.device_consumption,
      computedStyle,
      localize: this._i18n.localize,
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

  private _computeSeparateSources(
    types: EnergySourceByType,
    consumption: EnergyConsumptionData,
    timestamps: number[],
    computedStyle: CSSStyleDeclaration
  ): { nodes: Node[]; links: Link[] } {
    interface SourceNode {
      id: string;
      values?: Record<number, number>;
    }
    const nodes: Node[] = [];

    const addNode = (
      type: string,
      statId: string,
      colorVariable: string,
      idx: number,
      index: number,
      name: string | undefined
    ): SourceNode => {
      const id = `${type}:${statId}`;
      const values: Record<number, number> = {};
      let total = 0;
      this._data!.stats[statId]?.forEach(({ start, change }) => {
        if (change === null || change === undefined) {
          return;
        }
        values[start] = (values[start] ?? 0) + change;
        total += change;
      });
      nodes.push({
        id,
        label:
          name ||
          getStatisticLabel(
            this._states,
            this._formatEntityName,
            statId,
            this._data!.statsMetadata[statId]
          ),
        value: total,
        color: getEnergyColor(
          computedStyle,
          this._darkMode,
          false,
          false,
          colorVariable,
          idx
        ),
        index,
        entityId: statId in this._states ? statId : undefined,
        group: type,
      });
      return { id, values };
    };

    const batteryOut = (types.battery ?? []).map((source, idx) =>
      addNode(
        "battery",
        source.stat_energy_from,
        "--energy-battery-out-color",
        idx,
        0,
        source.name &&
          this._i18n.localize(
            "ui.panel.lovelace.cards.energy.energy_sources_table.named_battery_discharged",
            { name: source.name }
          )
      )
    );
    const batteryIn = (types.battery ?? []).map((source, idx) =>
      addNode(
        "battery_in",
        source.stat_energy_to,
        "--energy-battery-in-color",
        idx,
        1,
        source.name &&
          this._i18n.localize(
            "ui.panel.lovelace.cards.energy.energy_sources_table.named_battery_charged",
            { name: source.name }
          )
      )
    );
    const gridIn = (types.grid ?? [])
      .filter((source) => source.stat_energy_from)
      .map((source, idx) =>
        addNode(
          "grid",
          source.stat_energy_from!,
          "--energy-grid-consumption-color",
          idx,
          0,
          source.name && source.stat_energy_to
            ? this._i18n.localize(
                "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_imported",
                { name: source.name }
              )
            : source.name
        )
      );
    const solar = (types.solar ?? []).map((source, idx) =>
      addNode(
        "solar",
        source.stat_energy_from,
        "--energy-solar-color",
        idx,
        0,
        source.name
      )
    );
    const gridOut = (types.grid ?? [])
      .filter((source) => source.stat_energy_to)
      .map((source, idx) =>
        addNode(
          "grid_return",
          source.stat_energy_to!,
          "--energy-grid-return-color",
          idx,
          1,
          source.name && source.stat_energy_from
            ? this._i18n.localize(
                "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_exported",
                { name: source.name }
              )
            : source.name
        )
      );
    const home: SourceNode[] = [{ id: "home" }];

    const flows: [Record<number, number>, SourceNode[], SourceNode[]][] = [
      [consumption.used_battery, batteryOut, home],
      [consumption.grid_to_battery, gridIn, batteryIn],
      [consumption.solar_to_battery, solar, batteryIn],
      [consumption.used_grid, gridIn, home],
      [consumption.used_solar, solar, home],
      [consumption.battery_to_grid, batteryOut, gridOut],
      [consumption.solar_to_grid, solar, gridOut],
    ];
    const shares = (group: SourceNode[], t: number): SankeyFlowShare[] =>
      group.map(({ id, values }) => [id, values ? (values[t] ?? 0) : 1]);
    const links = new Map<string, Link & { value: number }>();
    for (const [flow, from, to] of flows) {
      for (const t of timestamps) {
        addSplitSankeyLinks(
          links,
          flow[t] ?? 0,
          shares(from, t),
          shares(to, t)
        );
      }
    }

    return { nodes, links: [...links.values()] };
  }

  private _valueFormatter = (value: number) => {
    const formatOptions =
      value < 0.1 ? { maximumFractionDigits: 3 } : undefined;
    return formatNumberWithUnit(value, "kWh", this._i18n.locale, formatOptions);
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
    "hui-energy-sankey-card": HuiEnergySankeyCard;
  }
}
