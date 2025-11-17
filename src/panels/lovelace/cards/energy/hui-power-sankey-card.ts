import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { PowerSankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { formatNumber } from "../../../../common/number/format_number";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";

const DEFAULT_CONFIG: Partial<PowerSankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-power-sankey-card")
class HuiPowerSankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

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
    const computedStyle = getComputedStyle(this);

    // Clear tracked entities and rebuild the set during render
    this._entities.clear();

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Collect all sources with their power values
    const sources: {
      id: string;
      value: number;
      type: string;
      color: string;
    }[] = [];

    // Collect solar sources
    prefs.energy_sources
      .filter((source) => source.type === "solar")
      .forEach((source) => {
        if (source.type !== "solar" || !source.stat_rate) return;
        const value = this._getCurrentPower(source.stat_rate);
        if (value >= 0.01) {
          sources.push({
            id: source.stat_rate,
            value,
            type: "solar",
            color: computedStyle
              .getPropertyValue("--energy-solar-color")
              .trim(),
          });
        }
      });

    // Collect grid import sources
    const gridSources = prefs.energy_sources.filter(
      (source) => source.type === "grid" && source.power
    );
    gridSources.forEach((source) => {
      if (source.type !== "grid" || !source.power) return;
      source.power.forEach((powerSource) => {
        const value = this._getCurrentPower(powerSource.stat_rate);
        if (value >= 0.01) {
          sources.push({
            id: powerSource.stat_rate,
            value,
            type: "grid",
            color: computedStyle
              .getPropertyValue("--energy-grid-consumption-color")
              .trim(),
          });
        }
      });
    });

    // Collect battery discharge sources
    const batterySources = prefs.energy_sources.filter(
      (source) => source.type === "battery"
    );
    batterySources.forEach((source) => {
      if (source.type !== "battery" || !source.stat_rate) return;
      const value = this._getCurrentPower(source.stat_rate);
      if (value >= 0.01) {
        sources.push({
          id: source.stat_rate,
          value,
          type: "battery",
          color: computedStyle
            .getPropertyValue("--energy-battery-out-color")
            .trim(),
        });
      }
    });

    // Create source nodes
    sources.forEach((source) => {
      nodes.push({
        id: source.id,
        label: this._getEntityLabel(source.id),
        value: source.value,
        color: source.color,
        index: 0,
      });
    });

    // Create home node early (value will be calculated later)
    const homeNode: Node = {
      id: "home",
      label: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_distribution.home"
      ),
      value: 0, // Will be updated later
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    // Collect consumers (battery charging, grid return)
    const consumers: { id: string; value: number }[] = [];
    let batteryChargingPower = 0;
    let gridReturnPower = 0;

    // Add battery charging as consumer
    batterySources.forEach((source) => {
      if (source.type !== "battery" || !source.stat_rate) return;
      const value = this._getCurrentPower(source.stat_rate);
      if (value < -0.01) {
        const chargingPower = Math.abs(value);
        batteryChargingPower += chargingPower;
        consumers.push({
          id: `${source.stat_rate}_charge`,
          value: chargingPower,
        });
        nodes.push({
          id: `${source.stat_rate}_charge`,
          label: this._getEntityLabel(source.stat_rate),
          value: chargingPower,
          color: computedStyle
            .getPropertyValue("--energy-battery-in-color")
            .trim(),
          index: 1,
        });
      }
    });

    // Add grid return as consumer
    gridSources.forEach((source) => {
      if (source.type !== "grid" || !source.power) return;
      source.power.forEach((powerSource) => {
        const value = this._getCurrentPower(powerSource.stat_rate);
        if (value < -0.01) {
          const returnPower = Math.abs(value);
          gridReturnPower += returnPower;
          consumers.push({
            id: `${powerSource.stat_rate}_return`,
            value: returnPower,
          });
          nodes.push({
            id: `${powerSource.stat_rate}_return`,
            label: this._getEntityLabel(powerSource.stat_rate),
            value: returnPower,
            color: computedStyle
              .getPropertyValue("--energy-grid-return-color")
              .trim(),
            index: 2,
          });
        }
      });
    });

    // Calculate home consumption from energy conservation:
    // Home = Total sources - Battery charging - Grid return
    const totalSourcePower = sources.reduce((sum, s) => sum + s.value, 0);
    homeNode.value = Math.max(
      0,
      totalSourcePower - batteryChargingPower - gridReturnPower
    );

    // Link sources to home (sankey component will distribute values)
    sources.forEach((source) => {
      links.push({
        source: source.id,
        target: "home",
      });
    });

    // Link sources to other consumers with constraints:
    // - Grid import can power: battery charging
    // - Solar can power: battery charging, grid return
    // - Battery discharge can power: grid return
    consumers.forEach((consumer) => {
      const isGridReturn = consumer.id.includes("_return");
      const isBatteryCharging = consumer.id.includes("_charge");

      // Filter sources based on consumer type
      const validSources = sources.filter((source) => {
        if (isGridReturn) {
          // Grid return can only come from solar or battery discharge
          return source.type === "solar" || source.type === "battery";
        }
        if (isBatteryCharging) {
          // Battery charging can come from grid or solar (not from battery discharge)
          return source.type === "grid" || source.type === "solar";
        }
        return true;
      });

      validSources.forEach((source) => {
        links.push({
          source: source.id,
          target: consumer.id,
        });
      });
    });

    let untrackedConsumption = homeNode.value;
    const deviceNodes: Node[] = [];
    const parentLinks: Record<string, string> = {};
    prefs.device_consumption.forEach((device, idx) => {
      if (!device.stat_rate) {
        return;
      }
      const value = this._getCurrentPower(device.stat_rate);

      if (value < 0.01) {
        return;
      }

      const node = {
        id: device.stat_rate,
        label: device.name || this._getEntityLabel(device.stat_rate),
        value,
        color: getGraphColorByIndex(idx, computedStyle),
        index: 5,
        parent: device.included_in_stat,
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

    // untracked consumption
    if (untrackedConsumption > 0.01) {
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
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${hasData
            ? html`<ha-sankey-chart
                .data=${{ nodes, links }}
                .vertical=${vertical}
                .valueFormatter=${this._valueFormatter}
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
      ${formatNumber(value, this.hass.locale, value < 0.1 ? { maximumFractionDigits: 3 } : undefined)}
      kW</div>`;

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
   *
   * @param parentLinks - Mapping of child device IDs to their parent device IDs.
   * @param deviceNodes - Array of device nodes to organize.
   * @returns Array of device node sections, ordered by hierarchy level.
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
   * Get current power value from entity state, normalized to kW
   * @param entityId - The entity ID to get power value from
   * @returns Power value in kW, or 0 if entity not found or invalid
   */
  private _getCurrentPower(entityId: string): number {
    // Track this entity for state change detection
    this._entities.add(entityId);

    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return 0;
    }
    const value = parseFloat(stateObj.state);
    if (isNaN(value)) {
      return 0;
    }

    // Normalize to kW based on unit of measurement (case-sensitive)
    // Supported units: GW, kW, MW, mW, TW, W
    const unit = stateObj.attributes.unit_of_measurement;
    switch (unit) {
      case "W":
        return value / 1000;
      case "mW":
        return value / 1000000;
      case "MW":
        return value * 1000;
      case "GW":
        return value * 1000000;
      case "TW":
        return value * 1000000000;
      default:
        // Assume kW if no unit or unit is kW
        return value;
    }
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
    :host {
      display: block;
      height: calc(
        var(--row-size, 8) *
          (var(--row-height, 50px) + var(--row-gap, 0px)) - var(--row-gap, 0px)
      );
    }
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
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
