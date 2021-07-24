import { mdiHome, mdiLeaf, mdiSolarPower, mdiTransmissionTower } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { subscribeOne } from "../../../common/util/subscribe-one";
import "../../../components/ha-svg-icon";
import { getConfigEntries } from "../../../data/config_entries";
import { energySourcesByType } from "../../../data/energy";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import {
  calculateStatisticsSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergySummaryCardConfig } from "./types";
import "../../../components/ha-card";

const renderSumStatHelper = (
  data: Statistics,
  stats: string[]
): number | undefined => {
  let totalGrowth = 0;

  for (const stat of stats) {
    if (!(stat in data)) {
      return undefined;
    }
    const statGrowth = calculateStatisticsSumGrowth(data[stat]);

    if (statGrowth === null) {
      return undefined;
    }

    totalGrowth += statGrowth;
  }

  return totalGrowth;
};

@customElement("hui-energy-usage-card")
class HuiEnergyUsageCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySummaryCardConfig;

  @state() private _stats?: Statistics;

  @state() private _co2SignalEntity?: string;

  private _fetching = false;

  public setConfig(config: EnergySummaryCardConfig): void {
    this._config = config;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (!this._fetching && !this._stats) {
      this._fetching = true;
      Promise.all([this._getStatistics(), this._fetchCO2SignalEntity()]).then(
        () => {
          this._fetching = false;
        }
      );
    }
  }

  protected render() {
    if (!this._config) {
      return html``;
    }

    if (!this._stats) {
      return html` Loading… `;
    }

    const prefs = this._config!.prefs;
    const types = energySourcesByType(prefs);

    // The strategy only includes this card if we have a grid.
    const hasConsumption = true;

    const hasSolarProduction = types.solar !== undefined;
    const hasReturnToGrid = hasConsumption && types.grid![0].flow_to.length > 0;

    let totalGridConsumption = renderSumStatHelper(
      this._stats,
      types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
    );

    // Temp for dev
    totalGridConsumption = 23;

    if (totalGridConsumption === undefined) {
      return html`Total consumption couldn't be calculated`;
    }

    let totalSolarProduction: number | undefined;

    if (hasSolarProduction) {
      totalSolarProduction = renderSumStatHelper(this._stats, [
        types.solar![0].stat_energy_from,
      ]);

      // Temp for dev
      totalSolarProduction = 8;

      if (totalSolarProduction === undefined) {
        return html`Total production couldn't be calculated`;
      }
    }

    let productionReturnedToGrid: number | undefined;

    if (hasReturnToGrid) {
      productionReturnedToGrid = renderSumStatHelper(
        this._stats,
        types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
      );

      // Temp for dev
      productionReturnedToGrid = 2;

      if (productionReturnedToGrid === undefined) {
        return html`Production returned to grid couldn't be calculated`;
      }
    }

    // total consumption = consumption_from_grid + solar_production - return_to_grid

    let co2percentage: number | undefined;

    if (this._co2SignalEntity) {
      const co2State = this.hass.states[this._co2SignalEntity];
      if (co2State) {
        co2percentage = Number(co2State.state);
        if (isNaN(co2percentage)) {
          co2percentage = undefined;
        }
      }

      // Temp for dev
      co2percentage = 23;
    }

    // We are calculating low carbon consumption based on what we got from the grid
    // minus what we gave back because what we gave back is low carbon
    const relativeGridFlow =
      totalGridConsumption - (productionReturnedToGrid || 0);

    let lowCarbonConsumption: number | undefined;

    if (co2percentage !== undefined) {
      if (relativeGridFlow > 0) {
        lowCarbonConsumption = relativeGridFlow * (co2percentage / 100);
      } else {
        lowCarbonConsumption = 0;
      }
    }

    const totalConsumption =
      totalGridConsumption +
      (totalSolarProduction || 0) -
      (productionReturnedToGrid || 0);

    const gridPctLowCarbon =
      co2percentage === undefined ? 0 : co2percentage / 100;
    const gridPctHighCarbon = 1 - gridPctLowCarbon;

    const homePctSolar =
      ((totalSolarProduction || 0) - (productionReturnedToGrid || 0)) /
      totalConsumption;
    // When we know the ratio solar-grid, we can adjust the low/high carbon
    // percentages to reflect that.
    const homePctGridLowCarbon = gridPctLowCarbon * (1 - homePctSolar);
    const homePctGridHighCarbon = gridPctHighCarbon * (1 - homePctSolar);

    return html`
      <ha-card header="Usage">
        <div class="card-content">
          <div class="row">
            ${co2percentage === undefined
              ? ""
              : html`
                  <div class="circle-container">
                    <span class="label">Low-carbon</span>
                    <div class="circle low-carbon">
                      <ha-svg-icon .path="${mdiLeaf}"></ha-svg-icon>
                      ${co2percentage}% / ${lowCarbonConsumption} kWh
                    </div>
                  </div>
                `}
            <div class="circle-container">
              <span class="label">Solar</span>
              <div class="circle solar">
                <ha-svg-icon .path="${mdiSolarPower}"></ha-svg-icon>
                ${totalSolarProduction} kWh
              </div>
            </div>
          </div>
          <div class="row">
            <div class="circle-container">
              <div class="circle grid">
                <ha-svg-icon .path="${mdiTransmissionTower}"></ha-svg-icon>
                ${totalGridConsumption - (productionReturnedToGrid || 0)} kWh
                <ul>
                  <li>
                    Grid high carbon: ${(gridPctHighCarbon * 100).toFixed(1)}%
                  </li>
                  <li>
                    Grid low carbon: ${(gridPctLowCarbon * 100).toFixed(1)}%
                  </li>
                </ul>
              </div>
              <span class="label">Grid</span>
            </div>
            <div class="circle-container home">
              <div class="circle home">
                <ha-svg-icon .path="${mdiHome}"></ha-svg-icon>
                ${totalConsumption} kWh
                <ul>
                  <li>
                    Grid high carbon:
                    ${(homePctGridHighCarbon * 100).toFixed(1)}%
                  </li>
                  <li>
                    Grid low carbon: ${(homePctGridLowCarbon * 100).toFixed(1)}%
                  </li>
                  <li>Solar: ${(homePctSolar * 100).toFixed(1)}%</li>
                </ul>
              </div>
              <span class="label">Home</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private async _fetchCO2SignalEntity() {
    const [configEntries, entityRegistryEntries] = await Promise.all([
      getConfigEntries(this.hass),
      subscribeOne(this.hass.connection, subscribeEntityRegistry),
    ]);

    const co2ConfigEntry = configEntries.find(
      (entry) => entry.domain === "co2signal"
    );

    if (!co2ConfigEntry) {
      return;
    }

    for (const entry of entityRegistryEntries) {
      if (entry.config_entry_id !== co2ConfigEntry.entry_id) {
        continue;
      }

      // The integration offers 2 entities. We want the % one.
      const co2State = this.hass.states[entry.entity_id];
      if (!co2State || co2State.attributes.unit_of_measurement !== "%") {
        continue;
      }

      this._co2SignalEntity = co2State.entity_id;
      break;
    }
  }

  private async _getStatistics(): Promise<void> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const statistics: string[] = [];
    const prefs = this._config!.prefs;
    for (const source of prefs.energy_sources) {
      if (source.type === "solar") {
        statistics.push(source.stat_energy_from);
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        statistics.push(flowFrom.stat_energy_from);
      }
      for (const flowTo of source.flow_to) {
        statistics.push(flowTo.stat_energy_to);
      }
    }

    this._stats = await fetchStatistics(
      this.hass!,
      startDate,
      undefined,
      statistics
    );
  }

  static styles = css`
    :host {
      --mdc-icon-size: 26px;
    }
    .row {
      display: flex;
      margin-bottom: 30px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .circle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 40px;
    }
    .circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 2px solid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 12px;
    }
    .label {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .circle-container:last-child {
      margin-right: 0;
    }
    .circle ul {
      display: none;
    }
    .low-carbon {
      border-color: #0da035;
    }
    .low-carbon ha-svg-icon {
      color: #0da035;
    }
    .solar {
      border-color: #ff9800;
    }
    .grid {
      border-color: #134763;
    }
    .circle-container.home {
      margin-left: 120px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-usage-card": HuiEnergyUsageCard;
  }
}
