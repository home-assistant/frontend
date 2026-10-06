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
import type { EnergyData } from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  formatFlowRateShort,
  getFlowRateFromState,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WaterFlowSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  DEFAULT_MAX_SANKEY_DEVICES,
  fireSankeyNodeMoreInfo,
  MIN_SANKEY_THRESHOLD_FACTOR,
} from "../energy/common/sankey";

const DEFAULT_CONFIG: Partial<WaterFlowSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-water-flow-sankey-card")
class HuiWaterFlowSankeyCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-sankey-card-editor");
    return document.createElement("hui-energy-sankey-card-editor");
  }

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: WaterFlowSankeyCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): WaterFlowSankeyCardConfig {
    return {
      type: "water-flow-sankey",
      layout: "auto",
      ...DEFAULT_CONFIG,
    };
  }

  @state() private _data?: EnergyData;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiWaterFlowSankeyCard, states) {
      const tracked: HassEntities = {};
      const prefs = this._data?.prefs;
      if (states && prefs) {
        [
          ...prefs.energy_sources.map((source) =>
            source.type === "water" ? source.stat_rate : undefined
          ),
          ...prefs.device_consumption_water.map((device) => device.stat_rate),
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

  public setConfig(config: WaterFlowSankeyCardConfig): void {
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
    const computedStyle = getComputedStyle(this);

    // Collect water sources with stat_rate
    const waterSources = prefs.energy_sources.filter(
      (source) => source.type === "water" && source.stat_rate
    );

    let totalInflow = 0;
    waterSources.forEach((source) => {
      if (source.type === "water" && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate);
        if (value > 0) totalInflow += value;
      }
    });

    // When there are no source meters, pre-compute total device flow so the
    // home node has the correct value (sum of all device consumption) rather
    // than 0. This avoids a broken sankey where the root node has value=0
    // while its children have positive values. Skip sub-trackers so the
    // total only reflects top-level devices and we don't double-count.
    let totalDeviceFlow = 0;
    if (waterSources.length === 0) {
      prefs.device_consumption_water.forEach((device) => {
        if (device.included_in_stat) {
          return;
        }
        if (device.stat_rate) {
          totalDeviceFlow += this._getCurrentFlowRate(device.stat_rate);
        }
      });
    }
    const effectiveTotalInflow =
      waterSources.length === 0 ? totalDeviceFlow : totalInflow;

    // Calculate dynamic threshold
    const minFlowThreshold = effectiveTotalInflow * MIN_SANKEY_THRESHOLD_FACTOR;

    const nodes: Node[] = [];
    const links: Link[] = [];
    const waterColor = computedStyle
      .getPropertyValue("--energy-water-color")
      .trim();
    const primaryColor = computedStyle
      .getPropertyValue("--primary-color")
      .trim();

    // Determine the "root" node for device links.
    // - 0 sources: home node (value = sum of device values, computed later)
    // - 1 source: that source node is the root (no home node)
    // - >1 sources: home node aggregates all sources
    const showHomeNode = waterSources.length !== 1;
    let rootNodeId: string;

    if (showHomeNode) {
      // Add source nodes and link to home
      waterSources.forEach((source) => {
        if (source.type !== "water" || !source.stat_rate) return;
        const value = this._getCurrentFlowRate(source.stat_rate);
        if (value <= 0) return;
        const sourceNodeId = `water_source_${source.stat_rate}`;
        nodes.push({
          id: sourceNodeId,
          label:
            this._getEntityLabel(source.stat_rate) ||
            this._i18n.localize(
              "ui.panel.lovelace.cards.energy.energy_distribution.water"
            ),
          value,
          color: waterColor,
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
    } else {
      // Single source: that source IS the root, no home node
      const source = waterSources[0];
      if (source.type === "water" && source.stat_rate) {
        const value = this._getCurrentFlowRate(source.stat_rate);
        nodes.push({
          id: source.stat_rate,
          label:
            this._getEntityLabel(source.stat_rate) ||
            this._i18n.localize(
              "ui.panel.lovelace.cards.energy.energy_distribution.water"
            ),
          value: Math.max(0, value),
          color: waterColor,
          index: 0,
          entityId: source.stat_rate,
        });
        rootNodeId = source.stat_rate;
      } else {
        // Fallback (shouldn't happen)
        rootNodeId = "home";
      }
    }

    const deviceLabels = computeEnergyDeviceLabels(
      this._states,
      this._formatEntityName,
      prefs.device_consumption_water,
      this._data.statsMetadata,
      "stat_rate"
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
      rootNodeId,
      minThreshold: minFlowThreshold,
      maxDevices: this._config.max_devices ?? DEFAULT_MAX_SANKEY_DEVICES,
      untrackedFloor: 1,
      ceilOtherValue: true,
      initialUntracked: effectiveTotalInflow,
      getId: (device) => device.stat_rate,
      getValue: (id) => this._getCurrentFlowRate(id),
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
      untrackedFloor: 1,
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

  private _valueFormatter = (value: number) =>
    formatFlowRateShort(
      this._i18n.locale,
      this._hassConfig.unit_system.length,
      value
    );

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    fireSankeyNodeMoreInfo(this, ev.detail.node);
  }

  private _getCurrentFlowRate(entityId: string): number {
    return getFlowRateFromState(this._states[entityId]) ?? 0;
  }

  private _getEntityLabel(entityId: string): string {
    const stateObj = this._states[entityId];
    if (!stateObj) return entityId;
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
    "hui-water-flow-sankey-card": HuiWaterFlowSankeyCard;
  }
}
