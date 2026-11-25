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
  EnergySumData,
} from "../../../../data/energy";
import {
  computeConsumptionData,
  computeEnergyDeviceLabels,
  energySourcesByType,
  getBatteryEnergyStatIds,
  getBatteryFlowStatIds,
  getBatteryName,
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

    const typeNodes: Node[] = [];
    const typeLinks: Link[] = [];

    if (types.battery) {
      const totalBatteryOut = summedData.total.from_battery ?? 0;
      const totalBatteryIn = summedData.total.to_battery ?? 0;

      // Add battery source
      typeNodes.push({
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
      typeLinks.push({
        source: "battery",
        target: "home",
        value: consumption.total.used_battery,
      });

      // Add battery sink
      typeNodes.push({
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
        typeLinks.push({
          source: "grid",
          target: "battery_in",
          value: consumption.total.grid_to_battery,
        });
      }
      if (consumption.total.solar_to_battery > 0) {
        typeLinks.push({
          source: "solar",
          target: "battery_in",
          value: consumption.total.solar_to_battery,
        });
      }
    }

    if (types.grid) {
      const totalFromGrid = summedData.total.from_grid ?? 0;

      typeNodes.push({
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

      typeLinks.push({
        source: "grid",
        target: "home",
        value: consumption.total.used_grid,
      });
    }

    // Add solar if available
    if (types.solar) {
      const totalSolarProduction = summedData.total.solar ?? 0;

      typeNodes.push({
        id: "solar",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: totalSolarProduction,
        color: computedStyle.getPropertyValue("--energy-solar-color").trim(),
        index: 0,
      });

      typeLinks.push({
        source: "solar",
        target: "home",
        value: consumption.total.used_solar,
      });
    }

    // Add grid return if available
    if (types.grid && types.grid.some((g) => g.stat_energy_to)) {
      const totalToGrid = summedData.total.to_grid ?? 0;

      typeNodes.push({
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
        typeLinks.push({
          source: "battery",
          target: "grid_return",
          value: consumption.total.battery_to_grid,
        });
      }
      if (consumption.total.solar_to_grid > 0) {
        typeLinks.push({
          source: "solar",
          target: "grid_return",
          value: consumption.total.solar_to_grid,
        });
      }
    }

    const combine =
      this._config.combine_sources ?? this._data.combineSources ?? true;
    const split = <T>(sources?: T[]) =>
      !combine && (sources?.length ?? 0) > 1 ? sources : undefined;
    const splitSources: EnergySourceByType = {
      battery: split(types.battery),
      grid: split(types.grid),
      solar: split(types.solar),
    };
    if (splitSources.battery || splitSources.grid || splitSources.solar) {
      const separate = this._computeSeparateSources(
        splitSources,
        typeNodes,
        typeLinks,
        consumption,
        summedData,
        computedStyle
      );
      nodes.push(...separate.nodes);
      links.push(...separate.links);
    } else {
      nodes.push(...typeNodes);
      links.push(...typeLinks);
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
    split: EnergySourceByType,
    typeNodes: Node[],
    typeLinks: Link[],
    consumption: EnergyConsumptionData,
    summedData: EnergySumData,
    computedStyle: CSSStyleDeclaration
  ): { nodes: Node[]; links: Link[] } {
    interface SourceNode {
      id: string;
      values?: Record<number, number>;
      // Flows of a battery with direction statistics, by the other node
      measured?: Record<string, Record<number, number>>;
    }
    const nodes: Node[] = [];

    const sumSeries = (statIds: (string | undefined)[]) => {
      const values: Record<number, number> = {};
      let total = 0;
      statIds.forEach((statId) => {
        if (!statId) {
          return;
        }
        this._data!.stats[statId]?.forEach(({ start, change }) => {
          if (change === null || change === undefined) {
            return;
          }
          values[start] = (values[start] ?? 0) + change;
          total += change;
        });
      });
      return { values, total };
    };

    const addNode = (
      type: string,
      statIds: string[],
      colorVariable: string,
      idx: number,
      index: number,
      name: string | undefined,
      measured?: SourceNode["measured"]
    ): SourceNode => {
      const statId = statIds[0];
      const id = `${type}:${statId}`;
      const { values, total } = sumSeries(statIds);
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
        entityId:
          statIds.length === 1 && statId in this._states ? statId : undefined,
        group: type,
      });
      return { id, values, measured };
    };

    const addGroup = <T>(
      type: string,
      sources: T[] | undefined,
      toNode: (source: T, idx: number) => SourceNode
    ): SourceNode[] => {
      if (!sources) {
        nodes.push(...typeNodes.filter((node) => node.id === type));
        return [{ id: type }];
      }
      return sources.map(toNode);
    };

    const batteryName = (
      source: NonNullable<EnergySourceByType["battery"]>[number],
      key: "named_battery_discharged" | "named_battery_charged"
    ) => {
      const name = getBatteryName(
        this._states,
        this._formatEntityName,
        source,
        this._data!.statsMetadata
      );
      return (
        name &&
        this._i18n.localize(
          `ui.panel.lovelace.cards.energy.energy_sources_table.${key}`,
          { name }
        )
      );
    };
    const series = (statId?: string) => sumSeries([statId]).values;
    const batteryOut = addGroup("battery", split.battery, (source, idx) => {
      const flows = getBatteryFlowStatIds(source);
      return addNode(
        "battery",
        getBatteryEnergyStatIds(source).discharge,
        "--energy-battery-out-color",
        idx,
        0,
        batteryName(source, "named_battery_discharged"),
        flows && {
          home: series(flows.battery_to_home),
          grid_return: series(flows.battery_to_grid),
        }
      );
    });
    const batteryIn = addGroup("battery_in", split.battery, (source, idx) => {
      const flows = getBatteryFlowStatIds(source);
      return addNode(
        "battery_in",
        getBatteryEnergyStatIds(source).charge,
        "--energy-battery-in-color",
        idx,
        1,
        batteryName(source, "named_battery_charged"),
        flows && {
          grid: series(flows.grid_to_battery),
          solar: series(flows.solar_to_battery),
        }
      );
    });
    const gridIn = addGroup(
      "grid",
      split.grid?.filter((source) => source.stat_energy_from),
      (source, idx) =>
        addNode(
          "grid",
          [source.stat_energy_from!],
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
    const solar = addGroup("solar", split.solar, (source, idx) =>
      addNode(
        "solar",
        [source.stat_energy_from],
        "--energy-solar-color",
        idx,
        0,
        source.name
      )
    );
    const gridOut = addGroup(
      "grid_return",
      split.grid?.filter((source) => source.stat_energy_to),
      (source, idx) =>
        addNode(
          "grid_return",
          [source.stat_energy_to!],
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

    const groups: Record<string, SourceNode[]> = {
      home: [{ id: "home" }],
      battery: batteryOut,
      battery_in: batteryIn,
      grid: gridIn,
      solar,
      grid_return: gridOut,
    };
    const flows: Record<string, Record<number, number>> = {
      "battery>home": consumption.used_battery,
      "grid>battery_in": consumption.grid_to_battery,
      "solar>battery_in": consumption.solar_to_battery,
      "grid>home": consumption.used_grid,
      "solar>home": consumption.used_solar,
      "battery>grid_return": consumption.battery_to_grid,
      "solar>grid_return": consumption.solar_to_grid,
    };
    const measuredFlows: Record<string, Record<number, number> | undefined> = {
      "battery>home": summedData.battery_to_home,
      "grid>battery_in": summedData.grid_to_battery,
      "solar>battery_in": summedData.solar_to_battery,
      "battery>grid_return": summedData.battery_to_grid,
    };
    const isSplit = (id: string) => groups[id][0]?.id !== id;
    // Batteries with direction statistics get their own flows, the rest of
    // a flow is split across the others
    const shares = (id: string, t: number): SankeyFlowShare[] =>
      groups[id]
        .filter((node) => !node.measured)
        .map(({ id: nodeId, values }) => [
          nodeId,
          values ? (values[t] ?? 0) : 1,
        ]);
    const exact = (node: SourceNode, other: string, t: number) =>
      Math.max(node.measured![other]?.[t] ?? 0, 0);
    const links = typeLinks.flatMap((link) => {
      if (!isSplit(link.source) && !isSplit(link.target)) {
        return [link];
      }
      const key = `${link.source}>${link.target}`;
      const flow = flows[key];
      const measuredSources = groups[link.source].filter((n) => n.measured);
      const measuredTargets = groups[link.target].filter((n) => n.measured);
      const measuredFlow =
        measuredSources.length || measuredTargets.length
          ? measuredFlows[key]
          : undefined;
      const splitLinks = new Map<string, Link & { value: number }>();
      for (const t of summedData.timestamps) {
        measuredSources.forEach((node) =>
          addSplitSankeyLinks(
            splitLinks,
            exact(node, link.target, t),
            [[node.id, 1]],
            shares(link.target, t)
          )
        );
        measuredTargets.forEach((node) =>
          addSplitSankeyLinks(
            splitLinks,
            exact(node, link.source, t),
            shares(link.source, t),
            [[node.id, 1]]
          )
        );
        addSplitSankeyLinks(
          splitLinks,
          (flow[t] ?? 0) - Math.max(measuredFlow?.[t] ?? 0, 0),
          shares(link.source, t),
          shares(link.target, t)
        );
      }
      return [...splitLinks.values()];
    });

    return { nodes, links };
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
