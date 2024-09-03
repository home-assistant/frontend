// @ts-ignore
import dataTableStyles from "@material/data-table/dist/mdc.data-table.min.css";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  unsafeCSS,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { formatNumber } from "../../../../common/number/format_number";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { getEnergyColor } from "./common/color";
import "../../../../components/ha-card";
import {
  EnergyData,
  energySourcesByType,
  getEnergyDataCollection,
  getEnergyGasUnit,
  getEnergyWaterUnit,
  getGenericEnergyTypes,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySourcesTableCardConfig } from "../types";
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

  private renderCategory(
    computedStyles: CSSStyleDeclaration,
    type: string,
    sources,
    unit: string,
    totalLabel: string,
    compare: boolean,
    showCosts: boolean,
    hasCosts,
    totalCosts,
    totalCostsCompare
  ) {
    let total = 0;
    let totalCompare = 0;
    let totalCost = 0;
    let totalCostCompare = 0;
    let hasCost = false;

    const category = html`
      ${sources.map((source, idx) => {
        const energy =
          calculateStatisticSumGrowth(
            this._data!.stats[source.stat_energy_from]
          ) || 0;
        total += energy;

        const energyCompare =
          (compare &&
            calculateStatisticSumGrowth(
              this._data!.statsCompare[source.stat_energy_from]
            )) ||
          0;
        totalCompare += energyCompare;

        const cost_stat =
          source.stat_cost ||
          this._data!.info.cost_sensors[source.stat_energy_from];
        const cost = cost_stat
          ? calculateStatisticSumGrowth(this._data!.stats[cost_stat]) || 0
          : null;
        if (cost !== null) {
          hasCost = true;
          totalCost += cost;
        }

        const costCompare =
          compare && cost_stat
            ? calculateStatisticSumGrowth(
                this._data!.statsCompare[cost_stat]
              ) || 0
            : null;
        if (costCompare !== null) {
          totalCostCompare += costCompare;
        }

        return html`<tr
          class="mdc-data-table__row ${classMap({
            clickable: !isExternalStatistic(source.stat_energy_from),
          })}"
          @click=${this._handleMoreInfo}
          .entity=${source.stat_energy_from}
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
                  `--energy-${type}-color`,
                  idx
                ),
                backgroundColor: getEnergyColor(
                  computedStyles,
                  this.hass.themes.darkMode,
                  true,
                  false,
                  `--energy-${type}-color`,
                  idx
                ),
              })}
            ></div>
          </td>
          <th class="mdc-data-table__cell" scope="row">
            ${getStatisticLabel(
              this.hass,
              source.stat_energy_from,
              this._data?.statsMetadata[source.stat_energy_from]
            )}
          </th>
          ${compare
            ? html` <td
                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                >
                  ${formatNumber(energyCompare, this.hass.locale)} ${unit}
                </td>
                ${showCosts
                  ? html`<td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${costCompare !== null
                        ? formatNumber(costCompare, this.hass.locale, {
                            style: "currency",
                            currency: this.hass.config.currency!,
                          })
                        : ""}
                    </td>`
                  : ""}`
            : ""}
          <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
            ${formatNumber(energy, this.hass.locale)} ${unit}
          </td>
          ${showCosts
            ? html`<td
                class="mdc-data-table__cell mdc-data-table__cell--numeric"
              >
                ${cost !== null
                  ? formatNumber(cost, this.hass.locale, {
                      style: "currency",
                      currency: this.hass.config.currency!,
                    })
                  : ""}
              </td>`
            : ""}
        </tr>`;
      })}
      ${sources
        ? html`<tr class="mdc-data-table__row total">
            <td class="mdc-data-table__cell"></td>
            <th class="mdc-data-table__cell" scope="row">${totalLabel}</th>
            ${compare
              ? html`<td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${formatNumber(totalCompare, this.hass.locale)} ${unit}
                  </td>
                  ${showCosts
                    ? html`<td
                        class="mdc-data-table__cell mdc-data-table__cell--numeric"
                      >
                        ${hasCost
                          ? formatNumber(totalCostCompare, this.hass.locale, {
                              style: "currency",
                              currency: this.hass.config.currency!,
                            })
                          : ""}
                      </td>`
                    : ""}`
              : ""}
            <td class="mdc-data-table__cell mdc-data-table__cell--numeric">
              ${formatNumber(total, this.hass.locale)} ${unit}
            </td>
            ${showCosts
              ? html`<td
                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                >
                  ${hasCost
                    ? formatNumber(totalCost, this.hass.locale, {
                        style: "currency",
                        currency: this.hass.config.currency!,
                      })
                    : ""}
                </td>`
              : ""}
          </tr>`
        : ""}
    `;

    totalCosts[type] = totalCost;
    totalCostsCompare[type] = totalCostCompare;
    hasCosts[type] = hasCost;

    return category;
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

    let hasGridCost = false;

    let totalGridCompare = 0;
    let totalGridCostCompare = 0;
    let totalSolarCompare = 0;
    let totalBatteryCompare = 0;

    const hasCosts: { [key: string]: boolean } = {};
    const totalCosts: { [key: string]: number } = {};
    const totalCostsCompare: { [key: string]: number } = {};

    const types = energySourcesByType(this._data.prefs);

    const computedStyles = getComputedStyle(this);

    const showCosts =
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
      ) ||
      types.custom?.some(
        (flow) =>
          flow.stat_cost || flow.entity_energy_price || flow.number_energy_price
      ) ||
      false;

    const gasUnit =
      getEnergyGasUnit(this.hass, this._data.prefs, this._data.statsMetadata) ||
      "";

    const waterUnit = getEnergyWaterUnit(this.hass) || "m³";

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

                return html`<tr
                  class="mdc-data-table__row ${classMap({
                    clickable: !isExternalStatistic(source.stat_energy_from),
                  })}"
                  @click=${this._handleMoreInfo}
                  .entity=${source.stat_energy_from}
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
                          colorPropertyMap.solar,
                          idx
                        ),
                        backgroundColor: getEnergyColor(
                          computedStyles,
                          this.hass.themes.darkMode,
                          true,
                          false,
                          colorPropertyMap.solar,
                          idx
                        ),
                      })}
                    ></div>
                  </td>
                  <th class="mdc-data-table__cell" scope="row">
                    ${getStatisticLabel(
                      this.hass,
                      source.stat_energy_from,
                      this._data?.statsMetadata[source.stat_energy_from]
                    )}
                  </th>
                  ${compare
                    ? html`<td
                          class="mdc-data-table__cell mdc-data-table__cell--numeric"
                        >
                          ${formatNumber(compareEnergy, this.hass.locale)} kWh
                        </td>
                        ${showCosts
                          ? html`<td class="mdc-data-table__cell"></td>`
                          : ""}`
                    : ""}
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${formatNumber(energy, this.hass.locale)} kWh
                  </td>
                  ${showCosts
                    ? html`<td class="mdc-data-table__cell"></td>`
                    : ""}
                </tr>`;
              })}
              ${types.solar
                ? html`<tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.solar_total"
                      )}
                    </th>
                    ${compare
                      ? html`<td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(totalSolarCompare, this.hass.locale)}
                            kWh
                          </td>
                          ${showCosts
                            ? html`<td class="mdc-data-table__cell"></td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(totalSolar, this.hass.locale)} kWh
                    </td>
                    ${showCosts
                      ? html`<td class="mdc-data-table__cell"></td>`
                      : ""}
                  </tr>`
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

                return html`<tr
                    class="mdc-data-table__row ${classMap({
                      clickable: !isExternalStatistic(source.stat_energy_from),
                    })}"
                    @click=${this._handleMoreInfo}
                    .entity=${source.stat_energy_from}
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
                            colorPropertyMap.battery_out,
                            idx
                          ),
                          backgroundColor: getEnergyColor(
                            computedStyles,
                            this.hass.themes.darkMode,
                            true,
                            false,
                            colorPropertyMap.battery_out,
                            idx
                          ),
                        })}
                      ></div>
                    </td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${getStatisticLabel(
                        this.hass,
                        source.stat_energy_from,
                        this._data?.statsMetadata[source.stat_energy_from]
                      )}
                    </th>
                    ${compare
                      ? html`<td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(energyFromCompare, this.hass.locale)}
                            kWh
                          </td>
                          ${showCosts
                            ? html`<td class="mdc-data-table__cell"></td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(energyFrom, this.hass.locale)} kWh
                    </td>
                    ${showCosts
                      ? html`<td class="mdc-data-table__cell"></td>`
                      : ""}
                  </tr>
                  <tr
                    class="mdc-data-table__row ${classMap({
                      clickable: !isExternalStatistic(source.stat_energy_to),
                    })}"
                    @click=${this._handleMoreInfo}
                    .entity=${source.stat_energy_to}
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
                            colorPropertyMap.battery_in,
                            idx
                          ),
                          backgroundColor: getEnergyColor(
                            computedStyles,
                            this.hass.themes.darkMode,
                            true,
                            false,
                            colorPropertyMap.battery_in,
                            idx
                          ),
                        })}
                      ></div>
                    </td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${getStatisticLabel(
                        this.hass,
                        source.stat_energy_to,
                        this._data?.statsMetadata[source.stat_energy_to]
                      )}
                    </th>
                    ${compare
                      ? html`<td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(
                              energyToCompare * -1,
                              this.hass.locale
                            )}
                            kWh
                          </td>
                          ${showCosts
                            ? html`<td class="mdc-data-table__cell"></td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(energyTo * -1, this.hass.locale)} kWh
                    </td>
                    ${showCosts
                      ? html`<td class="mdc-data-table__cell"></td>`
                      : ""}
                  </tr>`;
              })}
              ${types.battery
                ? html`<tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.battery_total"
                      )}
                    </th>
                    ${compare
                      ? html` <td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(
                              totalBatteryCompare,
                              this.hass.locale
                            )}
                            kWh
                          </td>
                          ${showCosts
                            ? html`<td class="mdc-data-table__cell"></td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(totalBattery, this.hass.locale)} kWh
                    </td>
                    ${showCosts
                      ? html`<td class="mdc-data-table__cell"></td>`
                      : ""}
                  </tr>`
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

                    return html`<tr
                      class="mdc-data-table__row ${classMap({
                        clickable: !isExternalStatistic(flow.stat_energy_from),
                      })}"
                      @click=${this._handleMoreInfo}
                      .entity=${flow.stat_energy_from}
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
                              colorPropertyMap.grid_consumption,
                              idx
                            ),
                            backgroundColor: getEnergyColor(
                              computedStyles,
                              this.hass.themes.darkMode,
                              true,
                              false,
                              colorPropertyMap.grid_consumption,
                              idx
                            ),
                          })}
                        ></div>
                      </td>
                      <th class="mdc-data-table__cell" scope="row">
                        ${getStatisticLabel(
                          this.hass,
                          flow.stat_energy_from,
                          this._data?.statsMetadata[flow.stat_energy_from]
                        )}
                      </th>
                      ${compare
                        ? html`<td
                              class="mdc-data-table__cell mdc-data-table__cell--numeric"
                            >
                              ${formatNumber(compareEnergy, this.hass.locale)}
                              kWh
                            </td>
                            ${showCosts
                              ? html`<td
                                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                                >
                                  ${costCompare !== null
                                    ? formatNumber(
                                        costCompare,
                                        this.hass.locale,
                                        {
                                          style: "currency",
                                          currency: this.hass.config.currency!,
                                        }
                                      )
                                    : ""}
                                </td>`
                              : ""}`
                        : ""}
                      <td
                        class="mdc-data-table__cell mdc-data-table__cell--numeric"
                      >
                        ${formatNumber(energy, this.hass.locale)} kWh
                      </td>
                      ${showCosts
                        ? html` <td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${cost !== null
                              ? formatNumber(cost, this.hass.locale, {
                                  style: "currency",
                                  currency: this.hass.config.currency!,
                                })
                              : ""}
                          </td>`
                        : ""}
                    </tr>`;
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

                    return html`<tr
                      class="mdc-data-table__row ${classMap({
                        clickable: !isExternalStatistic(flow.stat_energy_to),
                      })}"
                      @click=${this._handleMoreInfo}
                      .entity=${flow.stat_energy_to}
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
                              colorPropertyMap.grid_return,
                              idx
                            ),
                            backgroundColor: getEnergyColor(
                              computedStyles,
                              this.hass.themes.darkMode,
                              true,
                              false,
                              colorPropertyMap.grid_return,
                              idx
                            ),
                          })}
                        ></div>
                      </td>
                      <th class="mdc-data-table__cell" scope="row">
                        ${getStatisticLabel(
                          this.hass,
                          flow.stat_energy_to,
                          this._data?.statsMetadata[flow.stat_energy_to]
                        )}
                      </th>
                      ${compare
                        ? html`<td
                              class="mdc-data-table__cell mdc-data-table__cell--numeric"
                            >
                              ${formatNumber(energyCompare, this.hass.locale)}
                              kWh
                            </td>
                            ${showCosts
                              ? html`<td
                                  class="mdc-data-table__cell mdc-data-table__cell--numeric"
                                >
                                  ${costCompare !== null
                                    ? formatNumber(
                                        costCompare,
                                        this.hass.locale,
                                        {
                                          style: "currency",
                                          currency: this.hass.config.currency!,
                                        }
                                      )
                                    : ""}
                                </td>`
                              : ""}`
                        : ""}
                      <td
                        class="mdc-data-table__cell mdc-data-table__cell--numeric"
                      >
                        ${formatNumber(energy, this.hass.locale)} kWh
                      </td>
                      ${showCosts
                        ? html` <td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${cost !== null
                              ? formatNumber(cost, this.hass.locale, {
                                  style: "currency",
                                  currency: this.hass.config.currency!,
                                })
                              : ""}
                          </td>`
                        : ""}
                    </tr>`;
                  })}`
              )}
              ${types.grid &&
              (types.grid?.[0].flow_from?.length ||
                types.grid?.[0].flow_to?.length)
                ? html` <tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.grid_total"
                      )}
                    </th>
                    ${compare
                      ? html`<td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(totalGridCompare, this.hass.locale)}
                            kWh
                          </td>
                          ${showCosts
                            ? html`<td
                                class="mdc-data-table__cell mdc-data-table__cell--numeric"
                              >
                                ${hasGridCost
                                  ? formatNumber(
                                      totalGridCostCompare,
                                      this.hass.locale,
                                      {
                                        style: "currency",
                                        currency: this.hass.config.currency!,
                                      }
                                    )
                                  : ""}
                              </td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(totalGrid, this.hass.locale)} kWh
                    </td>
                    ${showCosts
                      ? html`<td
                          class="mdc-data-table__cell mdc-data-table__cell--numeric"
                        >
                          ${hasGridCost
                            ? formatNumber(totalGridCost, this.hass.locale, {
                                style: "currency",
                                currency: this.hass.config.currency!,
                              })
                            : ""}
                        </td>`
                      : ""}
                  </tr>`
                : ""}
              ${this.renderCategory(
                computedStyles,
                "gas",
                types.gas,
                gasUnit,
                this.hass.localize(
                  "ui.panel.lovelace.cards.energy.energy_sources_table.gas_total"
                ),
                compare,
                showCosts,
                hasCosts,
                totalCosts,
                totalCostsCompare
              )}
              ${this.renderCategory(
                computedStyles,
                "water",
                types.water,
                waterUnit,
                this.hass.localize(
                  "ui.panel.lovelace.cards.energy.energy_sources_table.water_total"
                ),
                compare,
                showCosts,
                hasCosts,
                totalCosts,
                totalCostsCompare
              )}
              ${getGenericEnergyTypes(this._data.prefs).map((type) =>
                this.renderCategory(
                  computedStyles,
                  type,
                  types.custom!.filter((t) => t.custom_type === type),
                  this._data!.statsMetadata[
                    types.custom!.filter((t) => t.custom_type === type)?.[0]
                      ?.stat_energy_from
                  ].display_unit_of_measurement || "",
                  this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_sources_table.generic_total",
                    { type: capitalizeFirstLetter(type.replaceAll("_", " ")) }
                  ),
                  compare,
                  showCosts,
                  hasCosts,
                  totalCosts,
                  totalCostsCompare
                )
              )}
              ${[...Object.values(hasCosts), hasGridCost].filter(Boolean)
                .length > 1
                ? html`<tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.total_costs"
                      )}
                    </th>
                    ${compare
                      ? html`<td class="mdc-data-table__cell"></td>
                          <td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(
                              totalGridCostCompare +
                                Object.values(totalCostsCompare).reduce(
                                  (partialSum, cost) => partialSum + cost,
                                  0
                                ),
                              this.hass.locale,
                              {
                                style: "currency",
                                currency: this.hass.config.currency!,
                              }
                            )}
                          </td>`
                      : ""}
                    <td class="mdc-data-table__cell"></td>
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(
                        totalGridCost +
                          Object.values(totalCosts).reduce(
                            (partialSum, cost) => partialSum + cost,
                            0
                          ),
                        this.hass.locale,
                        {
                          style: "currency",
                          currency: this.hass.config.currency!,
                        }
                      )}
                    </td>
                  </tr>`
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
        --mdc-typography-body2-font-weight: 500;
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
