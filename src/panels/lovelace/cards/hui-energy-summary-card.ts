import { mdiCashMultiple, mdiSolarPower } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import {
  energySourcesByType,
  GridSourceTypeEnergyPreference,
  SolarSourceTypeEnergyPreference,
} from "../../../data/energy";
import {
  calculateStatisticsSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergySummaryCardConfig } from "./types";

const renderSumStatHelper = (
  data: Statistics,
  stats: string[],
  unit: string
) => {
  let totalGrowth = 0;

  for (const stat of stats) {
    if (!(stat in data)) {
      return "stat missing";
    }
    const statGrowth = calculateStatisticsSumGrowth(data[stat]);

    if (statGrowth === null) {
      return "incomplete data";
    }

    totalGrowth += statGrowth;
  }

  return `${totalGrowth.toFixed(2)} ${unit}`;
};

@customElement("hui-energy-summary-card")
class HuiEnergySummaryCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySummaryCardConfig;

  @state() private _data?: Statistics;

  private _fetching = false;

  public setConfig(config: EnergySummaryCardConfig): void {
    this._config = config;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (!this._fetching && !this._data) {
      this._getStatistics();
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const prefs = this._config!.prefs;
    const types = energySourcesByType(prefs);

    const hasConsumption = types.grid !== undefined;
    const hasProduction = types.solar !== undefined;
    const hasReturnToGrid = hasConsumption && types.grid![0].flow_to.length > 0;
    const hasCost =
      hasConsumption &&
      types.grid![0].flow_from.some((flow) => flow.stat_cost !== null);

    // total consumption = consumption_from_grid + solar_production - return_to_grid

    return html`
      <ha-card header="Today">
        <div class="card-content">
          ${!hasConsumption
            ? ""
            : html`
                <div class="row">
                  <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
                  <div class="label">Total Consumption</div>
                  <div class="data">
                    ${!this._data
                      ? ""
                      : renderSumStatHelper(
                          this._data,
                          types.grid![0].flow_from.map(
                            (flow) => flow.stat_energy_from
                          ),
                          "kWh"
                        )}
                  </div>
                </div>
              `}
          ${!hasProduction
            ? ""
            : html`
                <div class="row">
                  <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
                  <div class="label">Total Production</div>
                  <div class="data">
                    ${!this._data
                      ? ""
                      : renderSumStatHelper(
                          this._data,
                          [types.solar![0].stat_energy_from],
                          "kWh"
                        )}
                  </div>
                </div>
              `}
          ${!hasReturnToGrid
            ? ""
            : html`
                <div class="row">
                  <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
                  <div class="label">Production returned to grid</div>
                  <div class="data">
                    ${!this._data
                      ? ""
                      : renderSumStatHelper(
                          this._data,
                          types.grid![0].flow_to.map(
                            (flow) => flow.stat_energy_to
                          ),
                          "kWh"
                        )}
                  </div>
                </div>
              `}
          ${!hasReturnToGrid || !hasProduction
            ? ""
            : html`
                <div class="row">
                  <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
                  <div class="label">Amount of produced power self used</div>
                  <div class="data">
                    ${!this._data
                      ? ""
                      : this._renderSolarPowerConsumptionRatio(
                          types.solar![0],
                          types.grid![0]
                        )}
                  </div>
                </div>
              `}
          ${!hasCost
            ? ""
            : html`
                <div class="row">
                  <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
                  <div class="label">Total costs of today</div>
                  <div class="data">
                    ${!this._data
                      ? ""
                      : renderSumStatHelper(
                          this._data,
                          types
                            .grid![0].flow_from.map((flow) => flow.stat_cost)
                            .filter(Boolean) as string[],
                          prefs.currency
                        )}
                  </div>
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  // This is superduper temp.
  private async _getStatistics(): Promise<void> {
    if (this._fetching) {
      return;
    }
    const startDate = new Date();
    // This should be _just_ today (since local midnight)
    // For now we do a lot because fake data is not recent.
    startDate.setHours(-24 * 30);

    this._fetching = true;
    const statistics: string[] = [];
    const prefs = this._config!.prefs;
    for (const source of prefs.energy_sources) {
      if (source.type === "solar") {
        statistics.push(source.stat_energy_from);
        if (source.stat_predicted_energy_from) {
          statistics.push(source.stat_predicted_energy_from);
        }
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        statistics.push(flowFrom.stat_energy_from);
        if (flowFrom.stat_cost) {
          statistics.push(flowFrom.stat_cost);
        }
      }
      for (const flowTo of source.flow_to) {
        statistics.push(flowTo.stat_energy_to);
      }
    }

    try {
      this._data = await fetchStatistics(
        this.hass!,
        startDate,
        undefined,
        statistics
      );
    } finally {
      this._fetching = false;
    }
  }

  private _renderSolarPowerConsumptionRatio(
    solarSource: SolarSourceTypeEnergyPreference,
    gridSource: GridSourceTypeEnergyPreference
  ) {
    let returnToGrid = 0;

    for (const flowTo of gridSource.flow_to) {
      if (!flowTo.stat_energy_to || !(flowTo.stat_energy_to in this._data!)) {
        continue;
      }
      const flowReturned = calculateStatisticsSumGrowth(
        this._data![flowTo.stat_energy_to]
      );
      if (flowReturned === null) {
        return "incomplete return data";
      }
      returnToGrid += flowReturned;
    }

    if (!(solarSource.stat_energy_from in this._data!)) {
      return "sun stat missing";
    }

    const production = calculateStatisticsSumGrowth(
      this._data![solarSource.stat_energy_from]
    );

    if (production === null) {
      return "incomplete solar data";
    }

    if (production === 0) {
      return "-";
    }

    const consumed = Math.max(
      Math.min(((production - returnToGrid) / production) * 100, 100),
      0
    );

    return `${consumed.toFixed(1)}%`;
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
      color: var(--primary-text-color);
    }
    ha-svg-icon {
      padding: 8px;
      color: var(--paper-item-icon-color);
    }
    div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label {
      flex: 1;
      margin-left: 16px;
    }
    .data {
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-summary-card": HuiEnergySummaryCard;
  }
}
