// @ts-ignore
import dataTableStyles from "@material/data-table/dist/mdc.data-table.min.css";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { round } from "../../../../common/number/round";
import "../../../../components/chart/statistics-chart";
import "../../../../components/ha-card";
import {
  EnergyInfo,
  getEnergyInfo,
  GridSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";

@customElement("hui-energy-costs-table-card")
export class HuiEnergyCostsTableCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _stats?: Statistics;

  @state() private _energyInfo?: EnergyInfo;

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  public willUpdate() {
    if (!this.hasUpdated) {
      this._getEnergyInfo().then(() => this._getStatistics());
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (!this._stats) {
      return html`Loading...`;
    }

    const source = this._config.prefs.energy_sources?.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;

    if (!source) {
      return html`No grid source found.`;
    }

    let totalEnergy = 0;
    let totalCost = 0;

    return html` <ha-card .header="${this._config.title}">
      <div class="mdc-data-table">
        <div class="mdc-data-table__table-container">
          <table class="mdc-data-table__table" aria-label="Dessert calories">
            <thead>
              <tr class="mdc-data-table__header-row">
                <th
                  class="mdc-data-table__header-cell"
                  role="columnheader"
                  scope="col"
                >
                  Grid source
                </th>
                <th
                  class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                  role="columnheader"
                  scope="col"
                >
                  Energy
                </th>
                <th
                  class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                  role="columnheader"
                  scope="col"
                >
                  Cost
                </th>
              </tr>
            </thead>
            <tbody class="mdc-data-table__content">
              ${source.flow_from.map((flow) => {
                const entity = this.hass.states[flow.stat_energy_from];
                const energy =
                  calculateStatisticSumGrowth(
                    this._stats![flow.stat_energy_from]
                  ) || 0;
                totalEnergy += energy;
                const cost_stat =
                  flow.stat_cost ||
                  this._energyInfo!.cost_sensors[flow.stat_energy_from];
                const cost =
                  (cost_stat &&
                    calculateStatisticSumGrowth(this._stats![cost_stat])) ||
                  0;
                totalCost += cost;
                return html`<tr class="mdc-data-table__row">
                  <th class="mdc-data-table__cell" scope="row">
                    ${entity ? computeStateName(entity) : flow.stat_energy_from}
                  </th>
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${round(energy)} kWh
                  </td>
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${this._config!.prefs.currency} ${cost.toFixed(2)}
                  </td>
                </tr>`;
              })}
              ${source.flow_to.map((flow) => {
                const entity = this.hass.states[flow.stat_energy_to];
                const energy =
                  (calculateStatisticSumGrowth(
                    this._stats![flow.stat_energy_to]
                  ) || 0) * -1;
                totalEnergy += energy;
                const cost_stat =
                  flow.stat_compensation ||
                  this._energyInfo!.cost_sensors[flow.stat_energy_to];
                const cost =
                  ((cost_stat &&
                    calculateStatisticSumGrowth(this._stats![cost_stat])) ||
                    0) * -1;
                totalCost += cost;
                return html`<tr class="mdc-data-table__row">
                  <th class="mdc-data-table__cell" scope="row">
                    ${entity ? computeStateName(entity) : flow.stat_energy_to}
                  </th>
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${round(energy)} kWh
                  </td>
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${this._config!.prefs.currency} ${cost.toFixed(2)}
                  </td>
                </tr>`;
              })}
              <tr class="mdc-data-table__row total">
                <th class="mdc-data-table__cell" scope="row">Total</th>
                <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
                  ${round(totalEnergy)} kWh
                </td>
                <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
                  ${this._config!.prefs.currency} ${totalCost.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ha-card>`;
  }

  private async _getEnergyInfo() {
    this._energyInfo = await getEnergyInfo(this.hass);
  }

  private async _getStatistics(): Promise<void> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

    const statistics: string[] = Object.values(this._energyInfo!.cost_sensors);
    const prefs = this._config!.prefs;
    for (const source of prefs.energy_sources) {
      if (source.type === "solar") {
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
        if (flowTo.stat_compensation) {
          statistics.push(flowTo.stat_compensation);
        }
      }
    }

    this._stats = await fetchStatistics(
      this.hass!,
      startDate,
      undefined,
      statistics
    );
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(dataTableStyles)}
      .mdc-data-table {
        width: 100%;
        border: 0;
      }
      .total {
        background-color: var(--primary-background-color);
        --mdc-typography-body2-font-weight: 500;
      }
      ha-card {
        height: 100%;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-costs-table-card": HuiEnergyCostsTableCard;
  }
}
