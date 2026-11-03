import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../../common/decorators/consume-context-entry";
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
  BatteryFlowStatIds,
  EnergyData,
  EnergyPreferences,
  EnergySourceByType,
  MeasuredBatteryFlows,
} from "../../../../data/energy";
import {
  BATTERY_FLOW_KEYS,
  computeConsumptionSingle,
  computeEnergyDeviceLabels,
  energySourcesByType,
  formatPowerShort,
  getBatteryFlowPowerIds,
  getBatteryName,
  getPowerFromState,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import { getStatisticLabel } from "../../../../data/recorder";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { PowerSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import {
  fillSankeyLinkValues,
  type Link,
  type Node,
} from "../../../../components/chart/ha-sankey-chart";
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
  used_solar: number;
  used_grid: number;
  used_battery: number;
  used_total: number;
  // Live flows of the batteries with direction sensors
  measured?: MeasuredBatteryFlows;
}

// Type links that a battery with direction sensors measures
const MEASURED_LINKS: Record<string, keyof BatteryFlowStatIds> = {
  "battery>home": "battery_to_home",
  "battery>grid_return": "battery_to_grid",
  "grid>battery_in": "grid_to_battery",
  "solar>battery_in": "solar_to_battery",
};

@customElement("hui-power-sankey-card")
class HuiPowerSankeyCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

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

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiPowerSankeyCard, states) {
      const tracked: HassEntities = {};
      const prefs = this._data?.prefs;
      if (states && prefs) {
        [
          ...prefs.energy_sources.flatMap((source) => {
            if (source.type === "gas" || source.type === "water") {
              return [];
            }
            const rates =
              source.type === "battery" && getBatteryFlowPowerIds(source);
            return rates ? Object.values(rates) : [source.stat_rate];
          }),
          ...prefs.device_consumption.map((device) => device.stat_rate),
        ].forEach((entityId) => {
          if (entityId && states[entityId]) {
            tracked[entityId] = states[entityId];
          }
        });
      }
      return preserveUnchangedEntityStatesRecord(this._states, tracked);
    },
    watch: ["_data"],
  })
  private _states: HassEntities = {};

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

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public setConfig(config: PowerSankeyCardConfig): void {
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
    const powerData = this._computePowerData(prefs);
    const computedStyle = getComputedStyle(this);
    const types = energySourcesByType(prefs);

    // Calculate dynamic threshold based on total consumption
    const minPowerThreshold =
      powerData.used_total * MIN_SANKEY_THRESHOLD_FACTOR;

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Create home node
    const homeNode: Node = {
      id: "home",
      label: types.home?.[0]?.name || this._hassConfig.location_name,
      value: Math.max(0, powerData.used_total),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    const typeNodes: Node[] = [];
    const typeLinks: Link[] = [];

    // Add battery source and sink if available
    if (powerData.from_battery > 0) {
      typeNodes.push({
        id: "battery",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.from_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-out-color")
          .trim(),
        index: 0,
      });
      typeLinks.push({
        source: "battery",
        target: "home",
        value: powerData.used_battery,
      });
    }

    if (powerData.to_battery > 0) {
      typeNodes.push({
        id: "battery_in",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.to_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-in-color")
          .trim(),
        index: 1,
      });
      if (powerData.grid_to_battery > 0) {
        typeLinks.push({
          source: "grid",
          target: "battery_in",
          value: powerData.grid_to_battery,
        });
      }
      if (powerData.solar_to_battery > 0) {
        typeLinks.push({
          source: "solar",
          target: "battery_in",
          value: powerData.solar_to_battery,
        });
      }
    }

    // Add grid source if available
    if (powerData.from_grid > 0) {
      typeNodes.push({
        id: "grid",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.from_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-consumption-color")
          .trim(),
        index: 0,
      });
      typeLinks.push({
        source: "grid",
        target: "home",
        value: powerData.used_grid,
      });
    }

    // Add solar if available
    if (powerData.solar > 0) {
      typeNodes.push({
        id: "solar",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: powerData.solar,
        color: computedStyle.getPropertyValue("--energy-solar-color").trim(),
        index: 0,
      });
      typeLinks.push({
        source: "solar",
        target: "home",
        value: powerData.used_solar,
      });
    }

    // Add grid return if available
    if (powerData.to_grid > 0) {
      typeNodes.push({
        id: "grid_return",
        label: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.to_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-return-color")
          .trim(),
        index: 1,
      });
      if (powerData.battery_to_grid > 0) {
        typeLinks.push({
          source: "battery",
          target: "grid_return",
          value: powerData.battery_to_grid,
        });
      }
      if (powerData.solar_to_grid > 0) {
        typeLinks.push({
          source: "solar",
          target: "grid_return",
          value: powerData.solar_to_grid,
        });
      }
    }

    const combine =
      this._config.combine_sources ?? this._data.combineSources ?? true;
    const split = <T extends { stat_rate?: string }>(sources?: T[]) =>
      !combine &&
      (sources?.filter((source) => source.stat_rate).length ?? 0) > 1
        ? sources
        : undefined;
    const splitSources: EnergySourceByType = {
      battery: split(types.battery),
      grid: split(types.grid),
      solar: split(types.solar),
    };
    if (splitSources.battery || splitSources.grid || splitSources.solar) {
      const separate = this._computeSeparateSources(
        splitSources,
        typeNodes,
        fillSankeyLinkValues(
          [homeNode, ...typeNodes].filter((node) => node.value > 0),
          typeLinks
        ),
        powerData.measured,
        computedStyle
      );
      nodes.push(...separate.nodes);
      links.push(...separate.links);
    } else {
      nodes.push(...typeNodes);
      links.push(...typeLinks);
    }

    const deviceLabels = computeEnergyDeviceLabels(
      this._states,
      this._formatEntityName,
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
      localize: this._i18n.localize,
      rootNodeId: "home",
      minThreshold: minPowerThreshold,
      maxDevices: this._config.max_devices ?? DEFAULT_MAX_SANKEY_DEVICES,
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
                  .data=${{ nodes, links }}
                  .vertical=${vertical}
                  .showValues=${this._config.show_values === true}
                  .valueFormatter=${this._valueFormatter}
                  @node-click=${this._handleNodeClick}
                ></ha-sankey-chart>`
              : html`${this._i18n.localize(
                  "ui.panel.lovelace.cards.energy.no_data"
                )}`
          }
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    formatPowerShort(this._i18n.locale, value);

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    fireSankeyNodeMoreInfo(this, ev.detail.node);
  }

  private _computeSeparateSources(
    split: EnergySourceByType,
    typeNodes: Node[],
    typeLinks: (Link & { value: number })[],
    measured: MeasuredBatteryFlows | undefined,
    computedStyle: CSSStyleDeclaration
  ): { nodes: Node[]; links: Link[] } {
    const nodes: Node[] = [];
    const flowPower = (entityId?: string) =>
      entityId ? Math.max(this._getCurrentPower(entityId), 0) : 0;
    const flowIds = (...ids: (string | undefined)[]) =>
      ids.filter((id): id is string => !!id);

    // Nodes of batteries with direction sensors get exact links instead of a
    // share of the type links
    const addNodes = <T extends { stat_rate?: string; name?: string }>(
      type: string,
      sources: T[] | undefined,
      sign: 1 | -1,
      colorVariable: string,
      index: number,
      getName: (source: T) => string | undefined,
      getFlowIds?: (source: T) => string[] | undefined
    ): SankeyFlowShare[] => {
      if (!sources) {
        nodes.push(...typeNodes.filter((node) => node.id === type));
        return [[type, 1]];
      }
      const shares: SankeyFlowShare[] = [];
      sources.forEach((source, idx) => {
        const ids = getFlowIds?.(source);
        const statId = ids ? ids[0] : source.stat_rate;
        if (!statId) {
          return;
        }
        const value = ids
          ? ids.reduce((sum, id) => sum + flowPower(id), 0)
          : sign * this._getCurrentPower(statId);
        if (value <= 0) {
          return;
        }
        const id = `${type}:${statId}`;
        nodes.push({
          id,
          label:
            getName(source) ||
            getStatisticLabel(
              this._states,
              this._formatEntityName,
              statId,
              this._data!.statsMetadata[statId]
            ),
          value,
          color: getEnergyColor(
            computedStyle,
            this._darkMode,
            false,
            false,
            colorVariable,
            idx
          ),
          index,
          group: type,
          entityId:
            (!ids || ids.length === 1) && statId in this._states
              ? statId
              : undefined,
        });
        if (!ids) {
          shares.push([id, value]);
        }
      });
      return shares;
    };

    const batteryName =
      (key: "named_battery_discharged" | "named_battery_charged") =>
      (source: NonNullable<EnergySourceByType["battery"]>[number]) => {
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

    const batteryOut = addNodes(
      "battery",
      split.battery,
      1,
      "--energy-battery-out-color",
      0,
      batteryName("named_battery_discharged"),
      (source) => {
        const rates = getBatteryFlowPowerIds(source);
        return rates && flowIds(rates.battery_to_home, rates.battery_to_grid);
      }
    );
    const batteryIn = addNodes(
      "battery_in",
      split.battery,
      -1,
      "--energy-battery-in-color",
      1,
      batteryName("named_battery_charged"),
      (source) => {
        const rates = getBatteryFlowPowerIds(source);
        return rates && flowIds(rates.grid_to_battery, rates.solar_to_battery);
      }
    );
    const gridIn = addNodes(
      "grid",
      split.grid,
      1,
      "--energy-grid-consumption-color",
      0,
      (source) =>
        source.name && source.stat_energy_from && source.stat_energy_to
          ? this._i18n.localize(
              "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_imported",
              { name: source.name }
            )
          : source.name
    );
    const solar = addNodes(
      "solar",
      split.solar,
      1,
      "--energy-solar-color",
      0,
      (source) => source.name
    );
    const gridOut = addNodes(
      "grid_return",
      split.grid,
      -1,
      "--energy-grid-return-color",
      1,
      (source) =>
        source.name && source.stat_energy_from && source.stat_energy_to
          ? this._i18n.localize(
              "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_exported",
              { name: source.name }
            )
          : source.name
    );
    const sharesByNode: Record<string, SankeyFlowShare[]> = {
      home: [["home", 1]],
      battery: batteryOut,
      battery_in: batteryIn,
      grid: gridIn,
      solar,
      grid_return: gridOut,
    };
    const sum = (shares: SankeyFlowShare[]) =>
      shares.reduce((total, [, value]) => total + value, 0);

    const links = new Map<string, Link & { value: number }>();
    if (split.battery) {
      addSplitSankeyLinks(
        links,
        Math.min(sum(batteryOut), sum(batteryIn)),
        batteryOut,
        batteryIn
      );
      split.battery.forEach((source) => {
        const rates = getBatteryFlowPowerIds(source);
        if (!rates) {
          return;
        }
        const outId = flowIds(rates.battery_to_home, rates.battery_to_grid)[0];
        const inId = flowIds(rates.grid_to_battery, rates.solar_to_battery)[0];
        if (outId) {
          const out: SankeyFlowShare[] = [[`battery:${outId}`, 1]];
          addSplitSankeyLinks(
            links,
            flowPower(rates.battery_to_home),
            out,
            sharesByNode.home
          );
          addSplitSankeyLinks(
            links,
            flowPower(rates.battery_to_grid),
            out,
            sharesByNode.grid_return
          );
        }
        if (inId) {
          const into: SankeyFlowShare[] = [[`battery_in:${inId}`, 1]];
          addSplitSankeyLinks(
            links,
            flowPower(rates.grid_to_battery),
            sharesByNode.grid,
            into
          );
          addSplitSankeyLinks(
            links,
            flowPower(rates.solar_to_battery),
            sharesByNode.solar,
            into
          );
        }
      });
    }
    typeLinks.forEach((link) => {
      const flow = MEASURED_LINKS[`${link.source}>${link.target}`];
      addSplitSankeyLinks(
        links,
        link.value - (split.battery && flow ? (measured?.[flow] ?? 0) : 0),
        sharesByNode[link.source],
        sharesByNode[link.target]
      );
    });

    return { nodes, links: [...links.values()] };
  }

  /**
   * Compute real-time power data from current entity states.
   * Similar to computeConsumptionData but for instantaneous power.
   */
  private _computePowerData(prefs: EnergyPreferences): PowerData {
    let solar = 0;
    let from_grid = 0;
    let to_grid = 0;
    let from_battery = 0;
    let to_battery = 0;

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
    const gridValues = prefs.energy_sources.flatMap((source) =>
      source.type === "grid" && source.stat_rate
        ? [this._getCurrentPower(source.stat_rate)]
        : []
    );
    gridValues.forEach((value) => {
      if (value > 0) {
        from_grid += value;
      } else if (value < 0) {
        to_grid += Math.abs(value);
      }
    });

    // Collect battery power (positive = discharge, negative = charge)
    // Sum all battery values first, then determine net direction.
    // Momentary power should only flow in one direction across all batteries.
    // Batteries with direction sensors are measured instead.
    let net_battery = 0;
    let hasMeasured = false;
    const measured: Record<keyof BatteryFlowStatIds, number> = {
      grid_to_battery: 0,
      solar_to_battery: 0,
      battery_to_home: 0,
      battery_to_grid: 0,
    };
    prefs.energy_sources.forEach((source) => {
      if (source.type !== "battery") {
        return;
      }
      const rates = getBatteryFlowPowerIds(source);
      if (rates) {
        hasMeasured = true;
        BATTERY_FLOW_KEYS.forEach((key) => {
          const entityId = rates[key];
          if (entityId) {
            measured[key] += Math.max(this._getCurrentPower(entityId), 0);
          }
        });
      } else if (source.stat_rate) {
        net_battery += this._getCurrentPower(source.stat_rate);
      }
    });
    if (net_battery > 0) {
      from_battery = net_battery;
    } else if (net_battery < 0) {
      to_battery = Math.abs(net_battery);
    }

    const homeStatRate = energySourcesByType(prefs).home?.find(
      (source) => source.stat_rate
    )?.stat_rate;
    const homePower = homeStatRate
      ? getPowerFromState(this._states[homeStatRate])
      : undefined;

    const flows = computeConsumptionSingle(
      { from_grid, to_grid, solar, to_battery, from_battery },
      { measured: hasMeasured ? measured : undefined, used_total: homePower }
    );

    return {
      ...flows,
      solar,
      from_grid,
      to_grid,
      from_battery:
        from_battery + measured.battery_to_home + measured.battery_to_grid,
      to_battery:
        to_battery + measured.grid_to_battery + measured.solar_to_battery,
      used_total: Math.max(0, flows.used_total),
      measured: hasMeasured ? measured : undefined,
    };
  }

  /**
   * Get current power value from entity state, normalized to watts (W)
   * @param entityId - The entity ID to get power value from
   * @returns Power value in W, or 0 if entity not found or invalid
   */
  private _getCurrentPower(entityId: string): number {
    // getPowerFromState returns power in W
    return getPowerFromState(this._states[entityId]) ?? 0;
  }

  /**
   * Get entity label (entity name or entity ID)
   * @param entityId - The entity ID to get label for
   * @returns Entity name if available, otherwise the entity ID
   */
  private _getEntityLabel(entityId: string): string {
    const stateObj = this._states[entityId];
    if (!stateObj) {
      return entityId;
    }
    return this._formatEntityName(stateObj) || entityId;
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
