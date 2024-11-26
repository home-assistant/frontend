import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
} from "../../../../data/energy";
import {
  calculateStatisticsSumGrowth,
  calculateStatisticSumGrowth,
  getStatisticLabel,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergySankeyCardConfig } from "../types";
import "../../../../components/chart/sankey-chart";
import type { Link, Node } from "../../../../components/chart/sankey-chart";
import { getGraphColorByIndex } from "../../../../common/color/colors";

@customElement("hui-energy-sankey-card")
class HuiEnergySankeyCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySankeyCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: EnergySankeyCardConfig): void {
    this._config = config;
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
    return 3;
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

    const nodes: Node[] = [];
    const links: Link[] = [];

    const homeNode = {
      id: "home",
      label: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_distribution.home"
      ),
      value: 0,
      color: "var(--primary-color)",
      index: 1,
    };
    nodes.push(homeNode);

    if (types.grid) {
      const totalFromGrid =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
        ) ?? 0;

      nodes.push({
        id: "grid",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: totalFromGrid,
        color: "var(--energy-grid-consumption-color)",
        index: 0,
      });

      links.push({
        source: "grid",
        target: "home",
      });
    }

    // Add solar if available
    if (types.solar) {
      const totalSolarProduction =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.solar.map((source) => source.stat_energy_from)
        ) || 0;

      nodes.push({
        id: "solar",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
        ),
        value: totalSolarProduction,
        color: "var(--energy-solar-color)",
        index: 0,
      });

      links.push({
        source: "solar",
        target: "home",
      });
    }

    // Add battery if available
    if (types.battery) {
      const totalBatteryIn =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.battery.map((source) => source.stat_energy_to)
        ) || 0;

      nodes.push({
        id: "battery_in",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: totalBatteryIn,
        color: "var(--energy-battery-in-color)",
        index: 1,
      });
      nodes.forEach((node) => {
        // Link all sources to battery_in
        if (node.index === 0) {
          links.push({
            source: node.id,
            target: "battery_in",
          });
        }
      });

      const totalBatteryOut =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.battery.map((source) => source.stat_energy_from)
        ) || 0;

      nodes.push({
        id: "battery",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
        ),
        value: totalBatteryOut,
        color: "var(--energy-battery-out-color)",
        index: 0,
      });
      links.push({
        source: "battery",
        target: "home",
      });
    }

    // grid return
    if (types.grid && types.grid[0].flow_to) {
      const totalToGrid =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.grid[0].flow_to.map((flow) => flow.stat_energy_to)
        ) ?? 0;

      nodes.push({
        id: "grid_return",
        label: this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.grid"
        ),
        value: totalToGrid,
        color: "var(--energy-grid-return-color)",
        index: 1,
      });
      nodes.forEach((node) => {
        // Link all sources to grid_return
        if (node.index === 0) {
          links.push({
            source: node.id,
            target: "grid_return",
          });
        }
      });
    }

    // Calculate total home consumption from all source nodes
    homeNode.value = nodes
      .filter((node) => node.index === 0)
      .reduce((sum, node) => sum + (node.value || 0), 0);

    // Group devices by areas and floors
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
    const computedStyle = getComputedStyle(this);
    prefs.device_consumption.forEach((device, idx) => {
      const entity = this.hass.entities[device.stat_consumption];
      const value =
        device.stat_consumption in this._data!.stats
          ? calculateStatisticSumGrowth(
              this._data!.stats[device.stat_consumption]
            ) || 0
          : 0;
      if (value <= 0) {
        return;
      }
      const deviceNode: Node = {
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
      };

      const deviceArea = entity?.area_id;
      if (deviceArea && this.hass.areas[deviceArea]) {
        const area = this.hass.areas[deviceArea];

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
        if (area.floor_id && this.hass.floors[area.floor_id]) {
          if (area.floor_id in floors) {
            floors[area.floor_id].value += deviceNode.value;
            if (!floors[area.floor_id].areas.includes(area.area_id)) {
              floors[area.floor_id].areas.push(area.area_id);
            }
          } else {
            floors[area.floor_id] = {
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

    Object.keys(floors)
      .sort(
        (a, b) =>
          (this.hass.floors[b]?.level ?? -Infinity) -
          (this.hass.floors[a]?.level ?? -Infinity)
      )
      .forEach((floorId) => {
        let floorNodeId = `floor_${floorId}`;
        if (this.hass.floors[floorId]) {
          nodes.push({
            id: floorNodeId,
            label: this.hass.floors[floorId].name,
            value: floors[floorId].value,
            index: 2,
          });
          links.push({
            source: "home",
            target: floorNodeId,
          });
        } else {
          // link "no_floor" areas to home
          floorNodeId = "home";
        }
        floors[floorId].areas.forEach((areaId) => {
          let areaNodeId = `area_${areaId}`;
          if (this.hass.areas[areaId]) {
            nodes.push({
              id: areaNodeId,
              label: this.hass.areas[areaId]!.name,
              value: areas[areaId].value,
              index: 3,
            });
            links.push({
              source: floorNodeId,
              target: areaNodeId,
              value: areas[areaId].value,
            });
          } else {
            // link "no_area" devices to home
            areaNodeId = "home";
          }
          areas[areaId].devices.forEach((device) => {
            nodes.push(device);
            links.push({
              source: areaNodeId,
              target: device.id,
              value: device.value,
            });
          });
        });
      });

    const hasData = nodes.some((node) => node.value > 0);

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${hasData
            ? html`<sankey-chart
                .hass=${this.hass}
                .data=${{ nodes, links }}
                .vertical=${this._config.vertical || false}
              ></sankey-chart>`
            : html`${this.hass.localize(
                "ui.panel.lovelace.cards.energy.no_data_period"
              )}`}
        </div>
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-sankey-card": HuiEnergySankeyCard;
  }
}
