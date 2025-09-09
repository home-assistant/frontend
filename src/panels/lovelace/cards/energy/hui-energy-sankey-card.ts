import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  computeConsumptionData,
  energySourcesByType,
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { EnergySankeyCardConfig } from "../types";
import "../../../../components/chart/ha-sankey-chart";
import type { Link, Node } from "../../../../components/chart/ha-sankey-chart";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { formatNumber } from "../../../../common/number/format_number";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";

const DEFAULT_CONFIG: Partial<EnergySankeyCardConfig> = {
  group_by_floor: true,
  group_by_area: true,
};

@customElement("hui-energy-sankey-card")
class HuiEnergySankeyCard
  extends SubscribeMixin(MobileAwareMixin(LitElement))
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySankeyCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: EnergySankeyCardConfig): void {
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
    return (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_isMobileSize")
    );
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
      label: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_distribution.home"
      ),
      value: Math.max(0, consumption.total.used_total),
      color: computedStyle.getPropertyValue("--primary-color").trim(),
      index: 1,
    };
    nodes.push(homeNode);

    if (types.battery) {
      const totalBatteryOut = summedData.total.from_battery ?? 0;
      const totalBatteryIn = summedData.total.to_battery ?? 0;

      // Add battery source
      nodes.push({
        id: "battery",
        label: this.hass.localize(
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
        label: this.hass.localize(
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

    if (types.grid) {
      const totalFromGrid = summedData.total.from_grid ?? 0;

      nodes.push({
        id: "grid",
        label: this.hass.localize(
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
    if (types.solar) {
      const totalSolarProduction = summedData.total.solar ?? 0;

      nodes.push({
        id: "solar",
        label: this.hass.localize(
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
    if (types.grid && types.grid[0].flow_to) {
      const totalToGrid = summedData.total.to_grid ?? 0;

      nodes.push({
        id: "grid_return",
        label: this.hass.localize(
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
          target: "grid",
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

    let untrackedConsumption = homeNode.value;
    const deviceNodes: Node[] = [];
    const parentLinks: Record<string, string> = {};
    prefs.device_consumption.forEach((device, idx) => {
      const value =
        device.stat_consumption in this._data!.stats
          ? calculateStatisticSumGrowth(
              this._data!.stats[device.stat_consumption]
            ) || 0
          : 0;
      if (value < 0.01) {
        return;
      }
      const node = {
        id: device.stat_consumption,
        label:
          device.name ||
          getStatisticLabel(
            this.hass,
            device.stat_consumption,
            this._data!.statsMetadata[device.stat_consumption]
          ),
        value,
        color: getGraphColorByIndex(idx, computedStyle),
        index: 4,
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
                label: this.hass.areas[areaId]!.name,
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
    if (untrackedConsumption > 0) {
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
                "ui.panel.lovelace.cards.energy.no_data_period"
              )}`}
        </div>
      </ha-card>
    `;
  }

  private _valueFormatter = (value: number) =>
    `${formatNumber(value, this.hass.locale, value < 0.1 ? { maximumFractionDigits: 3 } : undefined)} kWh`;

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
      const { area, floor } = getEntityContext(entity, this.hass);
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
    "hui-energy-sankey-card": HuiEnergySankeyCard;
  }
}
