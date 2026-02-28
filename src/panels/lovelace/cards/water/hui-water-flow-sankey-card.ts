import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { EnergyData } from "../../../../data/energy";
import {
  formatFlowRateShort,
  getEnergyDataCollection,
  getFlowRateFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WaterFlowSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";

const DEFAULT_CONFIG: Partial<WaterFlowSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

// Minimum flow threshold as a fraction of total inflow to display a device node.
// Devices below this threshold will be grouped into an "Other" node.
const MIN_FLOW_THRESHOLD_FACTOR = 0.001; // 0.1% of total inflow

interface SmallConsumer {
  statRate: string;
  name: string | undefined;
  value: number;
  effectiveParent: string | undefined;
  idx: number;
}

@customElement("hui-water-flow-sankey-card")
class HuiWaterFlowSankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: WaterFlowSankeyCardConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: WaterFlowSankeyCardConfig): void {
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
    if (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_isMobileSize")
    ) {
      return true;
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || !this._entities.size) {
        return true;
      }
      for (const entityId of this._entities) {
        if (oldHass.states[entityId] !== this.hass.states[entityId]) {
          return true;
        }
      }
    }

    return false;
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
    const computedStyle = getComputedStyle(this);

    // Clear tracked entities and rebuild set
    this._entities.clear();

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
    // while its children have positive values.
    let totalDeviceFlow = 0;
    if (waterSources.length === 0) {
      prefs.device_consumption_water.forEach((device) => {
        if (device.stat_rate) {
          totalDeviceFlow += this._getCurrentFlowRate(device.stat_rate);
        }
      });
    }
    const effectiveTotalInflow =
      waterSources.length === 0 ? totalDeviceFlow : totalInflow;

    // Calculate dynamic threshold
    const minFlowThreshold = effectiveTotalInflow * MIN_FLOW_THRESHOLD_FACTOR;

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
            this.hass.localize(
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
        label: this.hass.config.location_name,
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
            this.hass.localize(
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

    // Build a map of device relationships for hierarchy resolution
    const deviceMap = new Map<
      string,
      { stat_rate?: string; included_in_stat?: string }
    >();
    prefs.device_consumption_water.forEach((device) => {
      deviceMap.set(device.stat_consumption, {
        stat_rate: device.stat_rate,
        included_in_stat: device.included_in_stat,
      });
    });

    // Set of stat_rate entities that will be rendered as nodes
    const renderedStatRates = new Set<string>();
    prefs.device_consumption_water.forEach((device) => {
      if (device.stat_rate) {
        const value = this._getCurrentFlowRate(device.stat_rate);
        if (value >= minFlowThreshold) {
          renderedStatRates.add(device.stat_rate);
        }
      }
    });

    // Find the effective parent for hierarchy
    const findEffectiveParent = (
      includedInStat: string | undefined
    ): string | undefined => {
      let currentParent = includedInStat;
      while (currentParent) {
        const parentDevice = deviceMap.get(currentParent);
        if (!parentDevice) return undefined;
        if (
          parentDevice.stat_rate &&
          renderedStatRates.has(parentDevice.stat_rate)
        ) {
          return parentDevice.stat_rate;
        }
        currentParent = parentDevice.included_in_stat;
      }
      return undefined;
    };

    let untrackedConsumption = effectiveTotalInflow;
    const deviceNodes: Node[] = [];
    const parentLinks: Record<string, string> = {};
    const smallConsumersByParent = new Map<string, SmallConsumer[]>();

    prefs.device_consumption_water.forEach((device, idx) => {
      if (!device.stat_rate) return;
      const value = this._getCurrentFlowRate(device.stat_rate);
      const effectiveParent = findEffectiveParent(device.included_in_stat);

      if (value < minFlowThreshold) {
        const parentKey = effectiveParent ?? rootNodeId;
        if (!smallConsumersByParent.has(parentKey)) {
          smallConsumersByParent.set(parentKey, []);
        }
        smallConsumersByParent.get(parentKey)!.push({
          statRate: device.stat_rate,
          name: device.name,
          value,
          effectiveParent,
          idx,
        });
        return;
      }

      const node = {
        id: device.stat_rate,
        label: device.name || this._getEntityLabel(device.stat_rate),
        value,
        color: getGraphColorByIndex(idx, computedStyle),
        index: 4,
        parent: effectiveParent,
        entityId: device.stat_rate,
      };

      if (node.parent) {
        parentLinks[node.id] = node.parent;
        links.push({ source: node.parent, target: node.id });
      } else {
        untrackedConsumption -= value;
      }
      deviceNodes.push(node);
    });

    // Process small consumers
    smallConsumersByParent.forEach((consumers, parentKey) => {
      const totalValue = consumers.reduce((sum, c) => sum + c.value, 0);
      if (totalValue <= 0) return;

      if (consumers.length === 1) {
        const consumer = consumers[0];
        const node = {
          id: consumer.statRate,
          label: consumer.name || this._getEntityLabel(consumer.statRate),
          value: consumer.value,
          color: getGraphColorByIndex(consumer.idx, computedStyle),
          index: 4,
          parent: consumer.effectiveParent,
          entityId: consumer.statRate,
        };
        if (node.parent) {
          parentLinks[node.id] = node.parent;
          links.push({ source: node.parent, target: node.id });
        } else {
          untrackedConsumption -= consumer.value;
        }
        deviceNodes.push(node);
      } else {
        const otherNodeId = `other_${parentKey}`;
        const otherNode: Node = {
          id: otherNodeId,
          label: this.hass.localize(
            "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.other"
          ),
          value: Math.ceil(totalValue),
          color: computedStyle
            .getPropertyValue("--state-unavailable-color")
            .trim(),
          index: 4,
        };

        if (parentKey !== rootNodeId) {
          parentLinks[otherNodeId] = parentKey;
          links.push({ source: parentKey, target: otherNodeId });
        } else {
          untrackedConsumption -= totalValue;
        }
        deviceNodes.push(otherNode);
      }
    });

    const devicesWithoutParent = deviceNodes.filter(
      (node) => !parentLinks[node.id]
    );

    const { group_by_area, group_by_floor, layout, title } = this._config;
    if (group_by_area || group_by_floor) {
      const { areas, floors } = this._groupByFloorAndArea(devicesWithoutParent);

      Object.keys(floors)
        .sort(
          (a, b) =>
            (this.hass.floors[b]?.level ?? -Infinity) -
            (this.hass.floors[a]?.level ?? -Infinity)
        )
        .forEach((floorId) => {
          let floorNodeId = `floor_${floorId}`;
          if (floorId === "no_floor" || !group_by_floor) {
            floorNodeId = rootNodeId;
          } else {
            nodes.push({
              id: floorNodeId,
              label: this.hass.floors[floorId].name,
              value: floors[floorId].value,
              index: 2,
              color: primaryColor,
            });
            links.push({ source: rootNodeId, target: floorNodeId });
          }

          floors[floorId].areas.forEach((areaId) => {
            let targetNodeId: string;

            if (areaId === "no_area" || !group_by_area) {
              targetNodeId = floorNodeId;
            } else {
              const areaNodeId = `area_${areaId}`;
              nodes.push({
                id: areaNodeId,
                label: this.hass.areas[areaId]?.name || areaId,
                value: areas[areaId].value,
                index: 3,
                color: primaryColor,
              });
              links.push({
                source: floorNodeId,
                target: areaNodeId,
                value: areas[areaId].value,
              });
              targetNodeId = areaNodeId;
            }

            areas[areaId].devices.forEach((device) => {
              links.push({
                source: targetNodeId,
                target: device.id,
                value: device.value,
              });
            });
          });
        });
    } else {
      devicesWithoutParent.forEach((deviceNode) => {
        links.push({
          source: rootNodeId,
          target: deviceNode.id,
          value: deviceNode.value,
        });
      });
    }

    const deviceSections = this._getDeviceSections(parentLinks, deviceNodes);
    deviceSections.forEach((section, index) => {
      section.forEach((node: Node) => {
        nodes.push({ ...node, index: 4 + index });
      });
    });

    // Untracked consumption (only show if > 1 L/min threshold)
    if (untrackedConsumption > 1) {
      nodes.push({
        id: "untracked",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption"
        ),
        value: untrackedConsumption,
        color: computedStyle
          .getPropertyValue("--state-unavailable-color")
          .trim(),
        index: 3 + deviceSections.length,
      });
      links.push({
        source: rootNodeId,
        target: "untracked",
        value: untrackedConsumption,
      });
    }

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
          ${hasData
            ? html`<ha-sankey-chart
                .data=${{ nodes, links }}
                .vertical=${vertical}
                .valueFormatter=${this._valueFormatter}
                @node-click=${this._handleNodeClick}
              ></ha-sankey-chart>`
            : html`${this.hass.localize(
                "ui.panel.lovelace.cards.energy.no_data"
              )}`}
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    `<div style="direction:ltr; display: inline;">
      ${formatFlowRateShort(this.hass.locale, this.hass.config.unit_system.length, value)}
    </div>`;

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    const { node } = ev.detail;
    if (node.entityId) {
      fireEvent(this, "hass-more-info", { entityId: node.entityId });
    }
  }

  private _getCurrentFlowRate(entityId: string): number {
    this._entities.add(entityId);
    return getFlowRateFromState(this.hass.states[entityId]) ?? 0;
  }

  private _getEntityLabel(entityId: string): string {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return entityId;
    return stateObj.attributes.friendly_name || entityId;
  }

  protected _groupByFloorAndArea(deviceNodes: Node[]) {
    const areas: Record<string, { value: number; devices: Node[] }> = {
      no_area: { value: 0, devices: [] },
    };
    const floors: Record<string, { value: number; areas: string[] }> = {
      no_floor: { value: 0, areas: ["no_area"] },
    };

    deviceNodes.forEach((deviceNode) => {
      const entity = this.hass.states[deviceNode.id];
      const { area, floor } = entity
        ? getEntityContext(
            entity,
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          )
        : { area: null, floor: null };

      if (area) {
        if (area.area_id in areas) {
          areas[area.area_id].value += deviceNode.value;
          areas[area.area_id].devices.push(deviceNode);
        } else {
          areas[area.area_id] = {
            value: deviceNode.value,
            devices: [deviceNode],
          };
        }
        if (floor) {
          if (floor.floor_id in floors) {
            floors[floor.floor_id].value += deviceNode.value;
            if (!floors[floor.floor_id].areas.includes(area.area_id)) {
              floors[floor.floor_id].areas.push(area.area_id);
            }
          } else {
            floors[floor.floor_id] = {
              value: deviceNode.value,
              areas: [area.area_id],
            };
          }
        } else {
          floors.no_floor.value += deviceNode.value;
          if (!floors.no_floor.areas.includes(area.area_id)) {
            floors.no_floor.areas.unshift(area.area_id);
          }
        }
      } else {
        areas.no_area.value += deviceNode.value;
        areas.no_area.devices.push(deviceNode);
      }
    });

    return { areas, floors };
  }

  protected _getDeviceSections(
    parentLinks: Record<string, string>,
    deviceNodes: Node[]
  ): Node[][] {
    const parentSection: Node[] = [];
    const childSection: Node[] = [];
    const parentIds = Object.values(parentLinks);
    const remainingLinks: typeof parentLinks = {};

    deviceNodes.forEach((deviceNode) => {
      const isChild = deviceNode.id in parentLinks;
      const isParent = parentIds.includes(deviceNode.id);
      if (isParent && !isChild) {
        parentSection.push(deviceNode);
      } else {
        childSection.push(deviceNode);
      }
    });

    Object.entries(parentLinks).forEach(([child, parent]) => {
      if (!parentSection.some((node) => node.id === parent)) {
        remainingLinks[child] = parent;
      }
    });

    if (parentSection.length > 0) {
      return [
        parentSection,
        ...this._getDeviceSections(remainingLinks, childSection),
      ];
    }

    return [deviceNodes];
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
