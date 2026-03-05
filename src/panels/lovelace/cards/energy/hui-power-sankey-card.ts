import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { EnergyData, EnergyPreferences } from "../../../../data/energy";
import {
  formatPowerShort,
  getEnergyDataCollection,
  getPowerFromState,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { PowerSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";

const DEFAULT_CONFIG: Partial<PowerSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

// Minimum power threshold as a fraction of total consumption to display a device node
// Devices below this threshold will be grouped into an "Other" node
const MIN_POWER_THRESHOLD_FACTOR = 0.001; // 0.1% of used_total

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
}

interface SmallConsumer {
  statRate: string;
  name: string | undefined;
  value: number;
  effectiveParent: string | undefined;
  idx: number;
}

@customElement("hui-power-sankey-card")
class HuiPowerSankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: PowerSankeyCardConfig;

  @state() private _data?: EnergyData;

  private _entities = new Set<string>();

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: PowerSankeyCardConfig): void {
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

    // Check if any of the tracked entity states have changed
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || !this._entities.size) {
        return true;
      }

      // Only update if one of our tracked entities changed
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
    const powerData = this._computePowerData(prefs);
    const computedStyle = getComputedStyle(this);

    // Calculate dynamic threshold based on total consumption
    const minPowerThreshold = powerData.used_total * MIN_POWER_THRESHOLD_FACTOR;

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Create home node
    const homeNode: Node = {
      id: "home",
      label: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_distribution.home"
      ),
      value: Math.max(0, powerData.used_total),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    // Add battery source and sink if available
    if (powerData.from_battery > 0) {
      nodes.push({
        id: "battery",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.from_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-out-color")
          .trim(),
        index: 0,
      });
      links.push({
        source: "battery",
        target: "home",
      });
    }

    if (powerData.to_battery > 0) {
      nodes.push({
        id: "battery_in",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: powerData.to_battery,
        color: computedStyle
          .getPropertyValue("--energy-battery-in-color")
          .trim(),
        index: 1,
      });
      if (powerData.grid_to_battery > 0) {
        links.push({
          source: "grid",
          target: "battery_in",
        });
      }
      if (powerData.solar_to_battery > 0) {
        links.push({
          source: "solar",
          target: "battery_in",
        });
      }
    }

    // Add grid source if available
    if (powerData.from_grid > 0) {
      nodes.push({
        id: "grid",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.from_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-consumption-color")
          .trim(),
        index: 0,
      });
      links.push({
        source: "grid",
        target: "home",
      });
    }

    // Add solar if available
    if (powerData.solar > 0) {
      nodes.push({
        id: "solar",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: powerData.solar,
        color: computedStyle.getPropertyValue("--energy-solar-color").trim(),
        index: 0,
      });
      links.push({
        source: "solar",
        target: "home",
      });
    }

    // Add grid return if available
    if (powerData.to_grid > 0) {
      nodes.push({
        id: "grid_return",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: powerData.to_grid,
        color: computedStyle
          .getPropertyValue("--energy-grid-return-color")
          .trim(),
        index: 1,
      });
      if (powerData.battery_to_grid > 0) {
        links.push({
          source: "battery",
          target: "grid_return",
        });
      }
      if (powerData.solar_to_grid > 0) {
        links.push({
          source: "solar",
          target: "grid_return",
        });
      }
    }

    let untrackedConsumption = homeNode.value;
    const deviceNodes: Node[] = [];
    const parentLinks: Record<string, string> = {};

    // Build a map of device relationships for hierarchy resolution
    // Key: stat_consumption (energy), Value: { stat_rate, included_in_stat }
    const deviceMap = new Map<
      string,
      { stat_rate?: string; included_in_stat?: string }
    >();
    prefs.device_consumption.forEach((device) => {
      deviceMap.set(device.stat_consumption, {
        stat_rate: device.stat_rate,
        included_in_stat: device.included_in_stat,
      });
    });

    // Set of stat_rate entities that will be rendered as nodes
    const renderedStatRates = new Set<string>();
    prefs.device_consumption.forEach((device) => {
      if (device.stat_rate) {
        const value = this._getCurrentPower(device.stat_rate);
        if (value >= minPowerThreshold) {
          renderedStatRates.add(device.stat_rate);
        }
      }
    });

    // Find the effective parent for power hierarchy
    // Walks up the chain to find an ancestor with stat_rate that will be rendered
    const findEffectiveParent = (
      includedInStat: string | undefined
    ): string | undefined => {
      let currentParent = includedInStat;
      while (currentParent) {
        const parentDevice = deviceMap.get(currentParent);
        if (!parentDevice) {
          return undefined;
        }
        // If this parent has a stat_rate and will be rendered, use it
        if (
          parentDevice.stat_rate &&
          renderedStatRates.has(parentDevice.stat_rate)
        ) {
          return parentDevice.stat_rate;
        }
        // Otherwise, continue up the chain
        currentParent = parentDevice.included_in_stat;
      }
      return undefined;
    };

    // Collect small consumers by their effective parent
    const smallConsumersByParent = new Map<string, SmallConsumer[]>();

    prefs.device_consumption.forEach((device, idx) => {
      if (!device.stat_rate) {
        return;
      }
      const value = this._getCurrentPower(device.stat_rate);

      // Find the effective parent (may be different from direct parent if parent has no stat_rate)
      const effectiveParent = findEffectiveParent(device.included_in_stat);

      if (value < minPowerThreshold) {
        // Collect small consumers instead of skipping them
        const parentKey = effectiveParent ?? "home";
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
        links.push({
          source: node.parent,
          target: node.id,
        });
      } else {
        untrackedConsumption -= value;
      }
      deviceNodes.push(node);
    });

    // Process small consumers - create "Other" nodes or show single entities
    smallConsumersByParent.forEach((consumers, parentKey) => {
      const totalValue = consumers.reduce((sum, c) => sum + c.value, 0);
      if (totalValue <= 0) {
        return;
      }

      if (consumers.length === 1) {
        // Single entity - show it directly instead of grouping
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
          links.push({
            source: node.parent,
            target: node.id,
          });
        } else {
          untrackedConsumption -= consumer.value;
        }
        deviceNodes.push(node);
      } else {
        // Multiple entities - create "Other" group
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

        if (parentKey !== "home") {
          // Has a parent device
          parentLinks[otherNodeId] = parentKey;
          links.push({
            source: parentKey,
            target: otherNodeId,
          });
        } else {
          // Top-level "Other" - will be linked to home/floor/area later
          untrackedConsumption -= totalValue;
        }
        deviceNodes.push(otherNode);
      }
    });
    const devicesWithoutParent = deviceNodes.filter(
      (node) => !parentLinks[node.id]
    );

    const { group_by_area, group_by_floor } = this._config;
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
            // link "no_floor" areas to home
            floorNodeId = "home";
          } else {
            nodes.push({
              id: floorNodeId,
              label: this.hass.floors[floorId].name,
              value: floors[floorId].value,
              index: 2,
              color: computedStyle.getPropertyValue("--primary-color").trim(),
            });
            links.push({
              source: "home",
              target: floorNodeId,
            });
          }
          floors[floorId].areas.forEach((areaId) => {
            let targetNodeId: string;

            if (areaId === "no_area" || !group_by_area) {
              // If group_by_area is false, link devices to floor or home
              targetNodeId = floorNodeId;
            } else {
              // Create area node and link it to floor
              const areaNodeId = `area_${areaId}`;
              nodes.push({
                id: areaNodeId,
                label: this.hass.areas[areaId]?.name || areaId,
                value: areas[areaId].value,
                index: 3,
                color: computedStyle.getPropertyValue("--primary-color").trim(),
              });
              links.push({
                source: floorNodeId,
                target: areaNodeId,
                value: areas[areaId].value,
              });
              targetNodeId = areaNodeId;
            }

            // Link devices to the appropriate target (area, floor, or home)
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
          source: "home",
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

    // untracked consumption (only show if larger than 1W)
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
        source: "home",
        target: "untracked",
        value: untrackedConsumption,
      });
    }

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
      ${formatPowerShort(this.hass, value)}
    </div>`;

  private _handleNodeClick(ev: CustomEvent<{ node: Node }>) {
    const { node } = ev.detail;
    if (node.entityId) {
      fireEvent(this, "hass-more-info", { entityId: node.entityId });
    }
  }

  /**
   * Compute real-time power data from current entity states.
   * Similar to computeConsumptionData but for instantaneous power.
   */
  private _computePowerData(prefs: EnergyPreferences): PowerData {
    // Clear tracked entities and rebuild the set
    this._entities.clear();

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
    prefs.energy_sources
      .filter((source) => source.type === "grid" && source.power)
      .forEach((source) => {
        if (source.type === "grid" && source.power) {
          source.power.forEach((powerSource) => {
            const value = this._getCurrentPower(powerSource.stat_rate);
            if (value > 0) {
              from_grid += value;
            } else if (value < 0) {
              to_grid += Math.abs(value);
            }
          });
        }
      });

    // Collect battery power (positive = discharge, negative = charge)
    prefs.energy_sources
      .filter((source) => source.type === "battery")
      .forEach((source) => {
        if (source.type === "battery" && source.stat_rate) {
          const value = this._getCurrentPower(source.stat_rate);
          if (value > 0) {
            from_battery += value;
          } else if (value < 0) {
            to_battery += Math.abs(value);
          }
        }
      });

    // Calculate total consumption
    const used_total = from_grid + solar + from_battery - to_grid - to_battery;

    // Determine power routing using priority logic
    // Priority: Solar -> Battery_In, Solar -> Grid_Out, Battery_Out -> Grid_Out,
    // Grid_In -> Battery_In, Solar -> Consumption, Battery_Out -> Consumption, Grid_In -> Consumption

    let solar_remaining = solar;
    let grid_remaining = from_grid;
    let battery_remaining = from_battery;
    let to_battery_remaining = to_battery;
    let to_grid_remaining = to_grid;
    let used_total_remaining = Math.max(used_total, 0);

    let grid_to_battery = 0;
    let battery_to_grid = 0;
    let solar_to_battery = 0;
    let solar_to_grid = 0;
    let used_solar = 0;
    let used_battery = 0;
    let used_grid = 0;

    // Handle excess grid input to battery first
    const excess_grid_in_after_consumption = Math.max(
      0,
      Math.min(to_battery_remaining, grid_remaining - used_total_remaining)
    );
    grid_to_battery += excess_grid_in_after_consumption;
    to_battery_remaining -= excess_grid_in_after_consumption;
    grid_remaining -= excess_grid_in_after_consumption;

    // Solar -> Battery_In
    solar_to_battery = Math.min(solar_remaining, to_battery_remaining);
    to_battery_remaining -= solar_to_battery;
    solar_remaining -= solar_to_battery;

    // Solar -> Grid_Out
    solar_to_grid = Math.min(solar_remaining, to_grid_remaining);
    to_grid_remaining -= solar_to_grid;
    solar_remaining -= solar_to_grid;

    // Battery_Out -> Grid_Out
    battery_to_grid = Math.min(battery_remaining, to_grid_remaining);
    battery_remaining -= battery_to_grid;
    to_grid_remaining -= battery_to_grid;

    // Grid_In -> Battery_In (second pass)
    const grid_to_battery_2 = Math.min(grid_remaining, to_battery_remaining);
    grid_to_battery += grid_to_battery_2;
    grid_remaining -= grid_to_battery_2;
    to_battery_remaining -= grid_to_battery_2;

    // Solar -> Consumption
    used_solar = Math.min(used_total_remaining, solar_remaining);
    used_total_remaining -= used_solar;
    solar_remaining -= used_solar;

    // Battery_Out -> Consumption
    used_battery = Math.min(battery_remaining, used_total_remaining);
    battery_remaining -= used_battery;
    used_total_remaining -= used_battery;

    // Grid_In -> Consumption
    used_grid = Math.min(used_total_remaining, grid_remaining);
    grid_remaining -= used_grid;
    used_total_remaining -= used_grid;

    return {
      solar,
      from_grid,
      to_grid,
      from_battery,
      to_battery,
      grid_to_battery,
      battery_to_grid,
      solar_to_battery,
      solar_to_grid,
      used_solar,
      used_grid,
      used_battery,
      used_total: Math.max(0, used_total),
    };
  }

  protected _groupByFloorAndArea(deviceNodes: Node[]) {
    const areas: Record<string, { value: number; devices: Node[] }> = {
      no_area: {
        value: 0,
        devices: [],
      },
    };
    const floors: Record<string, { value: number; areas: string[] }> = {
      no_floor: {
        value: 0,
        areas: ["no_area"],
      },
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
        // see if the area has a floor
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

  /**
   * Organizes device nodes into hierarchical sections based on parent-child relationships.
   */
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
        // Top-level parents (have children but no parents themselves)
        parentSection.push(deviceNode);
      } else {
        childSection.push(deviceNode);
      }
    });

    // Filter out links where parent is already in current parent section
    Object.entries(parentLinks).forEach(([child, parent]) => {
      if (!parentSection.some((node) => node.id === parent)) {
        remainingLinks[child] = parent;
      }
    });

    if (parentSection.length > 0) {
      // Recursively process child section with remaining links
      return [
        parentSection,
        ...this._getDeviceSections(remainingLinks, childSection),
      ];
    }

    // Base case: no more parent-child relationships to process
    return [deviceNodes];
  }

  /**
   * Get current power value from entity state, normalized to watts (W)
   * @param entityId - The entity ID to get power value from
   * @returns Power value in W, or 0 if entity not found or invalid
   */
  private _getCurrentPower(entityId: string): number {
    // Track this entity for state change detection
    this._entities.add(entityId);

    // getPowerFromState returns power in W
    return getPowerFromState(this.hass.states[entityId]) ?? 0;
  }

  /**
   * Get entity label (friendly name or entity ID)
   * @param entityId - The entity ID to get label for
   * @returns Friendly name if available, otherwise the entity ID
   */
  private _getEntityLabel(entityId: string): string {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return entityId;
    }
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
    "hui-power-sankey-card": HuiPowerSankeyCard;
  }
}
