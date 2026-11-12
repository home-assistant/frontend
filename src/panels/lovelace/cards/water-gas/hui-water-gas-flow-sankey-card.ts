import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/ha-card";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData, WaterGasResource } from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  formatFlowRateShort,
  getFlowRateFromState,
  getFlowRateInUnit,
  getFlowRateUnit,
  getWaterGasDevices,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type {
  EnergyCardSankeyConfig,
  GasFlowSankeyCardConfig,
  WaterFlowSankeyCardConfig,
} from "../types";
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
  resolveSankeyParents,
} from "../energy/common/sankey";
import type { LocalizeKeys } from "../../../../common/translations/localize";

const DEFAULT_CONFIG = {
  group_by_floor: true,
  group_by_area: true,
};

abstract class HuiWaterGasFlowSankeyCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  protected abstract readonly resource: WaterGasResource;

  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: EnergyCardSankeyConfig;

  @state() private _data?: EnergyData;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiWaterGasFlowSankeyCard, states) {
      const tracked: HassEntities = {};
      const prefs = this._data?.prefs;
      if (states && prefs) {
        [
          ...prefs.energy_sources.map((source) =>
            source.type === this.resource ? source.stat_rate : undefined
          ),
          ...getWaterGasDevices(prefs, this.resource).map(
            (device) => device.stat_rate
          ),
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

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public setConfig(config: EnergyCardSankeyConfig): void {
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

  private _getRateUnit(): string | undefined {
    return this.resource === "water" || !this._data
      ? undefined
      : getFlowRateUnit(this.resource, this._data.prefs, this._states);
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this._i18n.localize("ui.panel.lovelace.cards.energy.loading")}`;
    }

    const resource = this.resource;
    const isWater = resource === "water";
    const prefs = this._data.prefs;
    // Gas shows the unit of its rate sensors (as the gas badge does); water keeps
    // the fixed L/min or gal/min. Set at the start of every render.
    const rateUnit = this._getRateUnit();
    const computedStyle = getComputedStyle(this);

    const prefDevices = getWaterGasDevices(prefs, resource);

    // Collect sources with a live stat_rate
    const sources = prefs.energy_sources.filter(
      (source) =>
        source.type === resource &&
        source.stat_rate &&
        getFlowRateFromState(this._states[source.stat_rate]) !== undefined
    );

    // Devices whose parent has no flow move up to the nearest ancestor with flow
    const devices = resolveSankeyParents(
      prefDevices,
      (d) =>
        !!d.stat_rate && this._getCurrentFlowRate(d.stat_rate, rateUnit) > 0
    );

    let totalInflow = 0;
    sources.forEach((source) => {
      if (source.type === resource && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate, rateUnit);
        if (value > 0) totalInflow += value;
      }
    });

    // When there are no source meters, pre-compute total device flow so the
    // home node has the correct value (sum of all device consumption) rather
    // than 0. This avoids a broken sankey where the root node has value=0
    // while its children have positive values. Skip sub-trackers so the
    // total only reflects top-level devices and we don't double-count.
    let totalDeviceFlow = 0;
    if (sources.length === 0) {
      devices.forEach((d) => {
        if (!d.included_in_stat && d.stat_rate) {
          totalDeviceFlow += Math.max(
            0,
            this._getCurrentFlowRate(d.stat_rate, rateUnit)
          );
        }
      });
    }
    const effectiveTotalInflow =
      sources.length === 0 ? totalDeviceFlow : totalInflow;

    // Calculate dynamic threshold
    const minFlowThreshold = effectiveTotalInflow * MIN_SANKEY_THRESHOLD_FACTOR;

    // Fixed floor and ceil only suit integer L/min; gas values in m³/h or
    // similar are often below 1
    const untrackedFloor = isWater ? 1 : minFlowThreshold;

    const nodes: Node[] = [];
    const links: Link[] = [];
    const resourceColor = computedStyle
      .getPropertyValue(`--energy-${resource}-color`)
      .trim();
    const primaryColor = computedStyle
      .getPropertyValue("--primary-color")
      .trim();

    const defaultSourceLabel = this._i18n.localize(
      `ui.panel.lovelace.cards.energy.energy_distribution.${resource}` as LocalizeKeys
    );

    // Determine the "root" node for device links.
    // - 0 sources: home node (value = sum of device values, computed later)
    // - 1 source: that source node is the root (no home node)
    // - >1 sources: home node aggregates all sources
    // - combined sources: one summed source node is the root (no home node)
    const combineSources =
      sources.length > 1 &&
      (this._config.combine_sources ?? this._data.combineSources ?? false);
    const showHomeNode = !combineSources && sources.length !== 1;
    let rootNodeId: string;

    if (showHomeNode) {
      // Add source nodes and link to home
      sources.forEach((source) => {
        if (source.type !== resource || !source.stat_rate) return;
        const value = this._getCurrentFlowRate(source.stat_rate, rateUnit);
        if (value <= 0) return;
        const sourceNodeId = `${resource}_source_${source.stat_rate}`;
        nodes.push({
          id: sourceNodeId,
          label: this._getEntityLabel(source.stat_rate) || defaultSourceLabel,
          value,
          color: resourceColor,
          index: 0,
          entityId: source.stat_rate,
        });
        links.push({ source: sourceNodeId, target: "home" });
      });

      const homeNode: Node = {
        id: "home",
        label: this._hassConfig.location_name,
        value: Math.max(0, effectiveTotalInflow),
        color: primaryColor,
        index: 1,
      };
      nodes.push(homeNode);
      rootNodeId = "home";
    } else if (combineSources) {
      nodes.push({
        id: `${resource}_source`,
        label: defaultSourceLabel,
        value: totalInflow,
        color: resourceColor,
        index: 0,
      });
      rootNodeId = `${resource}_source`;
    } else {
      const source = sources[0];
      if (source.type === resource && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate, rateUnit);
        nodes.push({
          id: source.stat_rate,
          label: this._getEntityLabel(source.stat_rate) || defaultSourceLabel,
          value: Math.max(0, value),
          color: resourceColor,
          index: 0,
          entityId: source.stat_rate,
        });
        rootNodeId = source.stat_rate;
      } else {
        rootNodeId = "home";
      }
    }

    const deviceLabels = computeEnergyDeviceLabels(
      this._states,
      this._formatEntityName,
      prefDevices,
      this._data.statsMetadata,
      "stat_rate"
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
      rootNodeId,
      minThreshold: minFlowThreshold,
      maxDevices: this._config.max_devices ?? DEFAULT_MAX_SANKEY_DEVICES,
      untrackedFloor,
      ceilOtherValue: isWater,
      initialUntracked: effectiveTotalInflow,
      getId: (device) => device.stat_rate,
      getValue: (id) => this._getCurrentFlowRate(id, rateUnit),
      getLabel: (id) => deviceLabels[id] || this._getEntityLabel(id),
      getEntityId: (id) => id,
    });
    links.push(...deviceLinks);

    const { group_by_area, group_by_floor, layout, title } = this._config;
    const sankeyLayout = buildSankeyLayout({
      states: this._states,
      registries: this._registries,
      computedStyle,
      localize: this._i18n.localize,
      deviceNodes,
      parentLinks,
      rootNodeId,
      groupByFloor: !!group_by_floor,
      groupByArea: !!group_by_area,
      untrackedConsumption,
      untrackedFloor,
    });
    nodes.push(...sankeyLayout.nodes);
    links.push(...sankeyLayout.links);

    const hasData = nodes.some((node) => node.value > 0);

    const vertical =
      layout === "vertical" || (layout !== "horizontal" && this._isMobileSize);

    return html`
      <ha-card
        .header=${title}
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

  private _valueFormatter = (value: number) => {
    const rateUnit = this._getRateUnit();
    return rateUnit
      ? formatNumberWithUnit(
          value,
          rateUnit,
          this._i18n.locale,
          value < 0.1 ? { maximumFractionDigits: 3 } : undefined
        )
      : formatFlowRateShort(
          this._i18n.locale,
          this._hassConfig.unit_system.length,
          value
        );
  };

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    fireSankeyNodeMoreInfo(this, ev.detail.node);
  }

  private _getCurrentFlowRate(entityId: string, rateUnit?: string): number {
    const stateObj = this._states[entityId];
    return (
      (rateUnit
        ? getFlowRateInUnit(stateObj, rateUnit)
        : getFlowRateFromState(stateObj)) ?? 0
    );
  }

  private _getEntityLabel(entityId: string): string {
    const stateObj = this._states[entityId];
    if (!stateObj) return entityId;
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

@customElement("hui-water-flow-sankey-card")
class HuiWaterFlowSankeyCard extends HuiWaterGasFlowSankeyCard {
  protected readonly resource = "water";

  public static getStubConfig(): WaterFlowSankeyCardConfig {
    return { type: "water-flow-sankey", layout: "auto", ...DEFAULT_CONFIG };
  }
}

@customElement("hui-gas-flow-sankey-card")
class HuiGasFlowSankeyCard extends HuiWaterGasFlowSankeyCard {
  protected readonly resource = "gas";

  public static getStubConfig(): GasFlowSankeyCardConfig {
    return { type: "gas-flow-sankey", layout: "auto", ...DEFAULT_CONFIG };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-flow-sankey-card": HuiWaterFlowSankeyCard;
    "hui-gas-flow-sankey-card": HuiGasFlowSankeyCard;
  }
}
