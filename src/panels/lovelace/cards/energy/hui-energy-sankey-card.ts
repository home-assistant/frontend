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

    // Calculate total home consumption from all source nodes
    homeNode.value = nodes
      .filter((node) => node.index === 0)
      .reduce((sum, node) => sum + (node.value || 0), 0);

    // Individual devices
    prefs.device_consumption.forEach((device) => {
      nodes.push({
        id: device.stat_consumption,
        label:
          device.name ||
          getStatisticLabel(
            this.hass,
            device.stat_consumption,
            this._data!.statsMetadata[device.stat_consumption]
          ),
        value: 0,
        index: 4,
      });

      links.push({
        source: "home",
        target: device.stat_consumption,
      });
    });

    // @TODO floors and areas

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          <sankey-chart
            .data=${{ nodes, links }}
            .vertical=${this._config.vertical || false}
          ></sankey-chart>
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
