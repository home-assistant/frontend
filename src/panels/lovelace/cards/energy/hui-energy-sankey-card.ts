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
        value: totalFromGrid,
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
        value: totalSolarProduction,
      });
    }

    // Add battery if available
    if (types.battery) {
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
        value: totalBatteryOut,
      });
    }

    // Calculate total home consumption from all source nodes
    homeNode.value = nodes
      .filter((node) => node.index === 0)
      .reduce((sum, node) => sum + (node.value || 0), 0);

    // Group devices by areas and floors
    const areaNodes: Record<string, Node> = {};
    const floorNodes: Record<string, Node> = {};

    // Individual devices
    prefs.device_consumption.forEach((device) => {
      const entity = this.hass.entities[device.stat_consumption];
      const deviceNode: Node = {
        id: device.stat_consumption,
        label:
          device.name ||
          getStatisticLabel(
            this.hass,
            device.stat_consumption,
            this._data!.statsMetadata[device.stat_consumption]
          ),
        value:
          device.stat_consumption in this._data!.stats
            ? calculateStatisticSumGrowth(
                this._data!.stats[device.stat_consumption]
              ) || 0
            : 0,
        index: 4,
      };
      nodes.push(deviceNode);

      const deviceArea = entity?.area_id;
      if (deviceArea && this.hass.areas[deviceArea]) {
        const area = this.hass.areas[deviceArea];

        // Create area node if it doesn't exist
        if (!areaNodes[area.area_id]) {
          areaNodes[area.area_id] = {
            id: `area_${area.area_id}`,
            label: area.name,
            value: deviceNode.value,
            index: 3,
          };
          nodes.push(areaNodes[area.area_id]);
        } else {
          areaNodes[area.area_id].value += deviceNode.value;
        }

        // Link device to its area
        links.push({
          source: areaNodes[area.area_id].id,
          target: device.stat_consumption,
          value: deviceNode.value,
        });

        // Create floor node if area has floor
        if (area.floor_id && this.hass.floors[area.floor_id]) {
          const floor = this.hass.floors[area.floor_id];
          if (!floorNodes[floor.floor_id]) {
            floorNodes[floor.floor_id] = {
              id: `floor_${floor.floor_id}`,
              label: floor.name,
              value: deviceNode.value,
              index: 2,
            };
            nodes.push(floorNodes[floor.floor_id]);
          } else {
            floorNodes[floor.floor_id].value += deviceNode.value;
          }

          // Link area to floor
          links.push({
            source: floorNodes[floor.floor_id].id,
            target: areaNodes[area.area_id].id,
          });
          // Link floor to home
          links.push({
            source: "home",
            target: floorNodes[floor.floor_id].id,
          });
        } else {
          links.push({
            source: "home",
            target: areaNodes[area.area_id].id,
          });
        }
      } else {
        links.push({
          source: "home",
          target: deviceNode.id,
          value: deviceNode.value,
        });
      }
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
