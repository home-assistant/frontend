// @ts-ignore
import dataTableStyles from "@material/data-table/dist/mdc.data-table.min.css";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, unsafeCSS, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { formatNumber } from "../../../../common/number/format_number";
import { getEnergyColor } from "./common/color";
import "../../../../components/ha-card";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergySourcesTableCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { fireEvent } from "../../../../common/dom/fire_event";

const colorPropertyMap = {
  grid_return: "--energy-grid-return-color",
  grid_consumption: "--energy-grid-consumption-color",
  battery_in: "--energy-battery-in-color",
  battery_out: "--energy-battery-out-color",
  solar: "--energy-solar-color",
  gas: "--energy-gas-color",
  water: "--energy-water-color",
};

@customElement("hui-energy-sources-table-card")
export class HuiEnergySourcesTableCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySourcesTableCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

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

  public setConfig(config: EnergySourcesTableCardConfig): void {
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected _renderRow(
    computedStyles: CSSStyleDeclaration,
    type: string,
    statId: string,
    idx: number,
    energy: number,
    compareEnergy: number,
    energyUnit: string,
    cost: number | null,
    compareCost: number | null,
    showCosts: boolean,
    compare: boolean
  ) {
    return html`<tr
      class="mdc-data-table__row ${classMap({
        clickable: !isExternalStatistic(statId),
      })}"
      @click=${this._handleMoreInfo}
      .entity=${statId}
    >
      <td class="mdc-data-table__cell cell-bullet">
        <div
          class="bullet"
          style=${styleMap({
            borderColor: getEnergyColor(
              computedStyles,
              this.hass.themes.darkMode,
              false,
              false,
              colorPropertyMap[type],
              idx
            ),
            backgroundColor: getEnergyColor(
              computedStyles,
              this.hass.themes.darkMode,
              true,
              false,
              colorPropertyMap[type],
              idx
            ),
          })}
        ></div>
      </td>
      <th class="mdc-data-table__cell" scope="row">
        ${getStatisticLabel(
          this.hass,
          statId,
          this._data?.statsMetadata[statId]
        )}
      </th>
      ${compare
        ? html`<td class="mdc-data-table__cell mdc-data-table__cell--numeric">
              ${formatNumber(compareEnergy, this.hass.locale)} ${energyUnit}
            </td>
            ${showCosts
              ? html`<td
                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                >
                  ${compareCost !== null
                    ? formatNumber(compareCost, this.hass.locale, {
                        style: "currency",
                        currency: this.hass.config.currency!,
                      })
                    : ""}
                </td>`
              : ""}`
        : ""}
      <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
        ${formatNumber(energy, this.hass.locale)} ${energyUnit}
      </td>
      ${showCosts
        ? html` <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
            ${cost !== null
              ? formatNumber(cost, this.hass.locale, {
                  style: "currency",
                  currency: this.hass.config.currency!,
                })
              : ""}
          </td>`
        : ""}
    </tr>`;
  }

  protected _renderTotalRow(
    label: string,
    energy: number | null,
    compareEnergy: number | null,
    energyUnit: string,
    cost: number | null,
    compareCost: number | null,
    showCosts: boolean,
    compare: boolean
  ) {
    return html` <tr class="mdc-data-table__row total">
      <td class="mdc-data-table__cell"></td>
      <th class="mdc-data-table__cell" scope="row">${label}</th>
      ${compare
        ? html`<td class="mdc-data-table__cell mdc-data-table__cell--numeric">
              ${compareEnergy === null
                ? ""
                : `${formatNumber(compareEnergy, this.hass.locale)} ${energyUnit}`}
            </td>
            ${showCosts
              ? html`<td
                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                >
                  ${compareCost !== null
                    ? formatNumber(compareCost, this.hass.locale, {
                        style: "currency",
                        currency: this.hass.config.currency!,
                      })
                    : ""}
                </td>`
              : ""}`
        : ""}
      <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
        ${energy === null
          ? ""
          : `${formatNumber(energy, this.hass.locale)} ${energyUnit}`}
      </td>
      ${showCosts
        ? html`<td class="mdc-data-table__cell mdc-data-table__cell--numeric">
            ${cost !== null
              ? formatNumber(cost, this.hass.locale, {
                  style: "currency",
                  currency: this.hass.config.currency!,
                })
              : ""}
          </td>`
        : ""}
    </tr>`;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    let totalGrid = 0;
    let totalGridCost = 0;
    let totalSolar = 0;
    let totalBattery = 0;
    let totalGas = 0;
    let totalGasCost = 0;
    let totalWater = 0;
    let totalWaterCost = 0;

    let hasGridCost = false;
    let hasGasCost = false;
    let hasWaterCost = false;

    let totalGridCompare = 0;
    let totalGridCostCompare = 0;
    let totalSolarCompare = 0;
    let totalBatteryCompare = 0;
    let totalGasCompare = 0;
    let totalGasCostCompare = 0;
    let totalWaterCompare = 0;
    let totalWaterCostCompare = 0;

    const types = energySourcesByType(this._data.prefs);

    const computedStyles = getComputedStyle(this);

    const showCosts = !!(
      types.grid?.[0].flow_from.some(
        (flow) =>
          flow.stat_cost || flow.entity_energy_price || flow.number_energy_price
      ) ||
      types.grid?.[0].flow_to.some(
        (flow) =>
          flow.stat_compensation ||
          flow.entity_energy_price ||
          flow.number_energy_price
      ) ||
      types.gas?.some(
        (flow) =>
          flow.stat_cost || flow.entity_energy_price || flow.number_energy_price
      ) ||
      types.water?.some(
        (flow) =>
          flow.stat_cost || flow.entity_energy_price || flow.number_energy_price
      )
    );

    const gasUnit = this._data.gasUnit;

    const waterUnit = this._data.waterUnit;

    const compare = this._data.statsCompare !== undefined;

    return html` <ha-card>
      ${this._config.title
        ? html`<h1 class="card-header">${this._config.title}</h1>`
        : ""}
      <div class="mdc-data-table">
        <div class="mdc-data-table__table-container">
          <table class="mdc-data-table__table" aria-label="Energy sources">
            <thead>
              <tr class="mdc-data-table__header-row">
                <th class="mdc-data-table__header-cell"></th>
                <th
                  class="mdc-data-table__header-cell"
                  role="columnheader"
                  scope="col"
                >
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_sources_table.source"
                  )}
                </th>
                ${compare
                  ? html`<th
                        class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                        role="columnheader"
                        scope="col"
                      >
                        ${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_sources_table.previous_energy"
                        )}
                      </th>
                      ${showCosts
                        ? html`<th
                            class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                            role="columnheader"
                            scope="col"
                          >
                            ${this.hass.localize(
                              "ui.panel.lovelace.cards.energy.energy_sources_table.previous_cost"
                            )}
                          </th>`
                        : ""}`
                  : ""}
                <th
                  class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                  role="columnheader"
                  scope="col"
                >
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_sources_table.energy"
                  )}
                </th>
                ${showCosts
                  ? html` <th
                      class="mdc-data-table__header-cell mdc-data-table__header-cell--numeric"
                      role="columnheader"
                      scope="col"
                    >
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.cost"
                      )}
                    </th>`
                  : ""}
              </tr>
            </thead>
            <tbody class="mdc-data-table__content">
              ${types.solar?.map((source, idx) => {
                const energy =
                  calculateStatisticSumGrowth(
                    this._data!.stats[source.stat_energy_from]
                  ) || 0;
                totalSolar += energy;

                const compareEnergy =
                  (compare &&
                    calculateStatisticSumGrowth(
                      this._data!.statsCompare[source.stat_energy_from]
                    )) ||
                  0;
                totalSolarCompare += compareEnergy;

                return this._renderRow(
                  computedStyles,
                  "solar",
                  source.stat_energy_from,
                  idx,
                  energy,
                  compareEnergy,
                  "kWh",
                  null,
                  null,
                  showCosts,
                  compare
                );
              })}
              ${types.solar
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.solar_total"
                    ),
                    totalSolar,
                    totalSolarCompare,
                    "kWh",
                    null,
                    null,
                    showCosts,
                    compare
                  )
                : ""}
              ${types.battery?.map((source, idx) => {
                const energyFrom =
                  calculateStatisticSumGrowth(
                    this._data!.stats[source.stat_energy_from]
                  ) || 0;
                const energyTo =
                  calculateStatisticSumGrowth(
                    this._data!.stats[source.stat_energy_to]
                  ) || 0;
                totalBattery += energyFrom - energyTo;

                const energyFromCompare =
                  (compare &&
                    calculateStatisticSumGrowth(
                      this._data!.statsCompare[source.stat_energy_from]
                    )) ||
                  0;
                const energyToCompare =
                  (compare &&
                    calculateStatisticSumGrowth(
                      this._data!.statsCompare[source.stat_energy_to]
                    )) ||
                  0;
                totalBatteryCompare += energyFromCompare - energyToCompare;

                return html` ${this._renderRow(
                  computedStyles,
                  "battery_out",
                  source.stat_energy_from,
                  idx,
                  energyFrom,
                  energyFromCompare,
                  "kWh",
                  null,
                  null,
                  showCosts,
                  compare
                )}${this._renderRow(
                  computedStyles,
                  "battery_in",
                  source.stat_energy_to,
                  idx,
                  -energyTo,
                  -energyToCompare,
                  "kWh",
                  null,
                  null,
                  showCosts,
                  compare
                )}`;
              })}
              ${types.battery
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.battery_total"
                    ),
                    totalBattery,
                    totalBatteryCompare,
                    "kWh",
                    null,
                    null,
                    showCosts,
                    compare
                  )
                : ""}
              ${types.grid?.map(
                (source) =>
                  html`${source.flow_from.map((flow, idx) => {
                    const energy =
                      calculateStatisticSumGrowth(
                        this._data!.stats[flow.stat_energy_from]
                      ) || 0;
                    totalGrid += energy;

                    const compareEnergy =
                      (compare &&
                        calculateStatisticSumGrowth(
                          this._data!.statsCompare[flow.stat_energy_from]
                        )) ||
                      0;
                    totalGridCompare += compareEnergy;

                    const cost_stat =
                      flow.stat_cost ||
                      this._data!.info.cost_sensors[flow.stat_energy_from];
                    const cost = cost_stat
                      ? calculateStatisticSumGrowth(
                          this._data!.stats[cost_stat]
                        ) || 0
                      : null;
                    if (cost !== null) {
                      hasGridCost = true;
                      totalGridCost += cost;
                    }

                    const costCompare =
                      compare && cost_stat
                        ? calculateStatisticSumGrowth(
                            this._data!.statsCompare[cost_stat]
                          ) || 0
                        : null;
                    if (costCompare !== null) {
                      totalGridCostCompare += costCompare;
                    }

                    return this._renderRow(
                      computedStyles,
                      "grid_consumption",
                      flow.stat_energy_from,
                      idx,
                      energy,
                      compareEnergy,
                      "kWh",
                      cost,
                      costCompare,
                      showCosts,
                      compare
                    );
                  })}
                  ${source.flow_to.map((flow, idx) => {
                    const energy =
                      (calculateStatisticSumGrowth(
                        this._data!.stats[flow.stat_energy_to]
                      ) || 0) * -1;
                    totalGrid += energy;
                    const cost_stat =
                      flow.stat_compensation ||
                      this._data!.info.cost_sensors[flow.stat_energy_to];
                    const cost = cost_stat
                      ? (calculateStatisticSumGrowth(
                          this._data!.stats[cost_stat]
                        ) || 0) * -1
                      : null;
                    if (cost !== null) {
                      hasGridCost = true;
                      totalGridCost += cost;
                    }

                    const energyCompare =
                      ((compare &&
                        calculateStatisticSumGrowth(
                          this._data!.statsCompare[flow.stat_energy_to]
                        )) ||
                        0) * -1;
                    totalGridCompare += energyCompare;

                    const costCompare =
                      compare && cost_stat
                        ? (calculateStatisticSumGrowth(
                            this._data!.statsCompare[cost_stat]
                          ) || 0) * -1
                        : null;
                    if (costCompare !== null) {
                      totalGridCostCompare += costCompare;
                    }

                    return this._renderRow(
                      computedStyles,
                      "grid_return",
                      flow.stat_energy_to,
                      idx,
                      energy,
                      energyCompare,
                      "kWh",
                      cost,
                      costCompare,
                      showCosts,
                      compare
                    );
                  })}`
              )}
              ${types.grid &&
              (types.grid?.[0].flow_from?.length ||
                types.grid?.[0].flow_to?.length)
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.grid_total"
                    ),
                    totalGrid,
                    totalGridCompare,
                    "kWh",
                    hasGridCost ? totalGridCost : null,
                    hasGridCost ? totalGridCostCompare : null,
                    showCosts,
                    compare
                  )
                : ""}
              ${types.gas?.map((source, idx) => {
                const energy =
                  calculateStatisticSumGrowth(
                    this._data!.stats[source.stat_energy_from]
                  ) || 0;
                totalGas += energy;

                const energyCompare =
                  (compare &&
                    calculateStatisticSumGrowth(
                      this._data!.statsCompare[source.stat_energy_from]
                    )) ||
                  0;
                totalGasCompare += energyCompare;

                const cost_stat =
                  source.stat_cost ||
                  this._data!.info.cost_sensors[source.stat_energy_from];
                const cost = cost_stat
                  ? calculateStatisticSumGrowth(this._data!.stats[cost_stat]) ||
                    0
                  : null;
                if (cost !== null) {
                  hasGasCost = true;
                  totalGasCost += cost;
                }

                const costCompare =
                  compare && cost_stat
                    ? calculateStatisticSumGrowth(
                        this._data!.statsCompare[cost_stat]
                      ) || 0
                    : null;
                if (costCompare !== null) {
                  totalGasCostCompare += costCompare;
                }

                return this._renderRow(
                  computedStyles,
                  "gas",
                  source.stat_energy_from,
                  idx,
                  energy,
                  energyCompare,
                  gasUnit,
                  cost,
                  costCompare,
                  showCosts,
                  compare
                );
              })}
              ${types.gas
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.gas_total"
                    ),
                    totalGas,
                    totalGasCompare,
                    gasUnit,
                    hasGasCost ? totalGasCost : null,
                    hasGasCost ? totalGasCostCompare : null,
                    showCosts,
                    compare
                  )
                : ""}
              ${types.water?.map((source, idx) => {
                const energy =
                  calculateStatisticSumGrowth(
                    this._data!.stats[source.stat_energy_from]
                  ) || 0;
                totalWater += energy;

                const energyCompare =
                  (compare &&
                    calculateStatisticSumGrowth(
                      this._data!.statsCompare[source.stat_energy_from]
                    )) ||
                  0;
                totalWaterCompare += energyCompare;

                const cost_stat =
                  source.stat_cost ||
                  this._data!.info.cost_sensors[source.stat_energy_from];
                const cost = cost_stat
                  ? calculateStatisticSumGrowth(this._data!.stats[cost_stat]) ||
                    0
                  : null;
                if (cost !== null) {
                  hasWaterCost = true;
                  totalWaterCost += cost;
                }

                const costCompare =
                  compare && cost_stat
                    ? calculateStatisticSumGrowth(
                        this._data!.statsCompare[cost_stat]
                      ) || 0
                    : null;
                if (costCompare !== null) {
                  totalWaterCostCompare += costCompare;
                }

                return this._renderRow(
                  computedStyles,
                  "water",
                  source.stat_energy_from,
                  idx,
                  energy,
                  energyCompare,
                  waterUnit,
                  cost,
                  costCompare,
                  showCosts,
                  compare
                );
              })}
              ${types.water
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.water_total"
                    ),
                    totalWater,
                    totalWaterCompare,
                    waterUnit,
                    hasWaterCost ? totalWaterCost : null,
                    hasWaterCost ? totalWaterCostCompare : null,
                    showCosts,
                    compare
                  )
                : ""}
              ${[hasGasCost, hasWaterCost, hasGridCost].filter(Boolean).length >
              1
                ? this._renderTotalRow(
                    this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_sources_table.total_costs"
                    ),
                    null,
                    null,
                    "",
                    totalGasCost + totalGridCost + totalWaterCost,
                    totalGasCostCompare +
                      totalGridCostCompare +
                      totalWaterCostCompare,
                    showCosts,
                    compare
                  )
                : ""}
            </tbody>
          </table>
        </div>
      </div>
    </ha-card>`;
  }

  private _handleMoreInfo(ev): void {
    const entityId = ev.currentTarget?.entity;
    if (entityId && !isExternalStatistic(entityId)) {
      fireEvent(this, "hass-more-info", { entityId });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(dataTableStyles)}
      .mdc-data-table {
        width: 100%;
        border: 0;
      }
      .mdc-data-table__header-cell,
      .mdc-data-table__cell {
        color: var(--primary-text-color);
        border-bottom-color: var(--divider-color);
        text-align: var(--float-start);
      }
      .mdc-data-table__row:not(.mdc-data-table__row--selected):hover {
        background-color: rgba(var(--rgb-primary-text-color), 0.04);
      }
      .clickable {
        cursor: pointer;
      }
      .total {
        --mdc-typography-body2-font-weight: var(--ha-font-weight-medium);
      }
      .total .mdc-data-table__cell {
        border-top: 1px solid var(--divider-color);
      }
      ha-card {
        height: 100%;
        overflow: hidden;
      }
      .card-header {
        padding-bottom: 0;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
      .cell-bullet {
        width: 32px;
        padding-right: 0;
        padding-inline-end: 0;
        padding-inline-start: 16px;
        direction: var(--direction);
      }
      .bullet {
        border-width: 1px;
        border-style: solid;
        border-radius: 4px;
        height: 16px;
        width: 32px;
      }
      .mdc-data-table__cell--numeric {
        direction: ltr;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-sources-table-card": HuiEnergySourcesTableCard;
  }
}
