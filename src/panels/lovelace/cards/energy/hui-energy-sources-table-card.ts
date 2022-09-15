// @ts-ignore
import dataTableStyles from "@material/data-table/dist/mdc.data-table.min.css";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import {
  rgb2hex,
  lab2rgb,
  rgb2lab,
  hex2rgb,
} from "../../../../common/color/convert-color";
import { labBrighten, labDarken } from "../../../../common/color/lab";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import {
  EnergyData,
  energySourcesByType,
  getEnergyDataCollection,
  getEnergyGasUnit,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySourcesTableCardConfig } from "../types";

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

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
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

    let totalGridCompare = 0;
    let totalGridCostCompare = 0;
    let totalSolarCompare = 0;
    let totalBatteryCompare = 0;
    let totalGasCompare = 0;
    let totalGasCostCompare = 0;

    const types = energySourcesByType(this._data.prefs);

    const computedStyles = getComputedStyle(this);
    const solarColor = computedStyles
      .getPropertyValue("--energy-solar-color")
      .trim();
    const batteryFromColor = computedStyles
      .getPropertyValue("--energy-battery-out-color")
      .trim();
    const batteryToColor = computedStyles
      .getPropertyValue("--energy-battery-in-color")
      .trim();
    const returnColor = computedStyles
      .getPropertyValue("--energy-grid-return-color")
      .trim();
    const consumptionColor = computedStyles
      .getPropertyValue("--energy-grid-consumption-color")
      .trim();
    const gasColor = computedStyles
      .getPropertyValue("--energy-gas-color")
      .trim();

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
      );

    const gasUnit =
      getEnergyGasUnit(this._data.prefs, this._data.statsMetadata) || "";

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

                const modifiedColor =
                  idx > 0
                    ? this.hass.themes.darkMode
                      ? labBrighten(rgb2lab(hex2rgb(solarColor)), idx)
                      : labDarken(rgb2lab(hex2rgb(solarColor)), idx)
                    : undefined;
                const color = modifiedColor
                  ? rgb2hex(lab2rgb(modifiedColor))
                  : solarColor;

                return html`<tr class="mdc-data-table__row">
                  <td class="mdc-data-table__cell cell-bullet">
                    <div
                      class="bullet"
                      style=${styleMap({
                        borderColor: color,
                        backgroundColor: color + "7F",
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
                      Solar total
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

                const modifiedFromColor =
                  idx > 0
                    ? this.hass.themes.darkMode
                      ? labBrighten(rgb2lab(hex2rgb(batteryFromColor)), idx)
                      : labDarken(rgb2lab(hex2rgb(batteryFromColor)), idx)
                    : undefined;
                const fromColor = modifiedFromColor
                  ? rgb2hex(lab2rgb(modifiedFromColor))
                  : batteryFromColor;
                const modifiedToColor =
                  idx > 0
                    ? this.hass.themes.darkMode
                      ? labBrighten(rgb2lab(hex2rgb(batteryToColor)), idx)
                      : labDarken(rgb2lab(hex2rgb(batteryToColor)), idx)
                    : undefined;
                const toColor = modifiedToColor
                  ? rgb2hex(lab2rgb(modifiedToColor))
                  : batteryToColor;

                return html`<tr class="mdc-data-table__row">
                    <td class="mdc-data-table__cell cell-bullet">
                      <div
                        class="bullet"
                        style=${styleMap({
                          borderColor: fromColor,
                          backgroundColor: fromColor + "7F",
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
                  <tr class="mdc-data-table__row">
                    <td class="mdc-data-table__cell cell-bullet">
                      <div
                        class="bullet"
                        style=${styleMap({
                          borderColor: toColor,
                          backgroundColor: toColor + "7F",
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
                (source) => html`${source.flow_from.map((flow, idx) => {
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

                  const modifiedColor =
                    idx > 0
                      ? this.hass.themes.darkMode
                        ? labBrighten(rgb2lab(hex2rgb(consumptionColor)), idx)
                        : labDarken(rgb2lab(hex2rgb(consumptionColor)), idx)
                      : undefined;
                  const color = modifiedColor
                    ? rgb2hex(lab2rgb(modifiedColor))
                    : consumptionColor;

                  return html`<tr class="mdc-data-table__row">
                    <td class="mdc-data-table__cell cell-bullet">
                      <div
                        class="bullet"
                        style=${styleMap({
                          borderColor: color,
                          backgroundColor: color + "7F",
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
                            ${formatNumber(compareEnergy, this.hass.locale)} kWh
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

                  const modifiedColor =
                    idx > 0
                      ? this.hass.themes.darkMode
                        ? labBrighten(rgb2lab(hex2rgb(returnColor)), idx)
                        : labDarken(rgb2lab(hex2rgb(returnColor)), idx)
                      : undefined;
                  const color = modifiedColor
                    ? rgb2hex(lab2rgb(modifiedColor))
                    : returnColor;

                  return html`<tr class="mdc-data-table__row">
                    <td class="mdc-data-table__cell cell-bullet">
                      <div
                        class="bullet"
                        style=${styleMap({
                          borderColor: color,
                          backgroundColor: color + "7F",
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
                            ${formatNumber(energyCompare, this.hass.locale)} kWh
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
              ${types.grid
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
                                ${formatNumber(
                                  totalGridCostCompare,
                                  this.hass.locale,
                                  {
                                    style: "currency",
                                    currency: this.hass.config.currency!,
                                  }
                                )}
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
                          ${formatNumber(totalGridCost, this.hass.locale, {
                            style: "currency",
                            currency: this.hass.config.currency!,
                          })}
                        </td>`
                      : ""}
                  </tr>`
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

                const modifiedColor =
                  idx > 0
                    ? this.hass.themes.darkMode
                      ? labBrighten(rgb2lab(hex2rgb(gasColor)), idx)
                      : labDarken(rgb2lab(hex2rgb(gasColor)), idx)
                    : undefined;
                const color = modifiedColor
                  ? rgb2hex(lab2rgb(modifiedColor))
                  : gasColor;

                return html`<tr class="mdc-data-table__row">
                  <td class="mdc-data-table__cell cell-bullet">
                    <div
                      class="bullet"
                      style=${styleMap({
                        borderColor: color,
                        backgroundColor: color + "7F",
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
                          ${formatNumber(energyCompare, this.hass.locale)}
                          ${gasUnit}
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
                  <td
                    class="mdc-data-table__cell mdc-data-table__cell--numeric"
                  >
                    ${formatNumber(energy, this.hass.locale)} ${gasUnit}
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
              ${types.gas
                ? html`<tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.gas_total"
                      )}
                    </th>
                    ${compare
                      ? html`<td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(totalGasCompare, this.hass.locale)}
                            ${gasUnit}
                          </td>
                          ${showCosts
                            ? html`<td
                                class="mdc-data-table__cell mdc-data-table__cell--numeric"
                              >
                                ${formatNumber(
                                  totalGasCostCompare,
                                  this.hass.locale,
                                  {
                                    style: "currency",
                                    currency: this.hass.config.currency!,
                                  }
                                )}
                              </td>`
                            : ""}`
                      : ""}
                    <td
                      class="mdc-data-table__cell mdc-data-table__cell--numeric"
                    >
                      ${formatNumber(totalGas, this.hass.locale)} ${gasUnit}
                    </td>
                    ${showCosts
                      ? html`<td
                          class="mdc-data-table__cell mdc-data-table__cell--numeric"
                        >
                          ${formatNumber(totalGasCost, this.hass.locale, {
                            style: "currency",
                            currency: this.hass.config.currency!,
                          })}
                        </td>`
                      : ""}
                  </tr>`
                : ""}
              ${totalGasCost && totalGridCost
                ? html`<tr class="mdc-data-table__row total">
                    <td class="mdc-data-table__cell"></td>
                    <th class="mdc-data-table__cell" scope="row">
                      ${this.hass.localize(
                        "ui.panel.lovelace.cards.energy.energy_sources_table.total_costs"
                      )}
                    </th>
                    ${compare
                      ? html`${showCosts
                            ? html`<td class="mdc-data-table__cell"></td>`
                            : ""}
                          <td
                            class="mdc-data-table__cell mdc-data-table__cell--numeric"
                          >
                            ${formatNumber(
                              totalGasCostCompare + totalGridCostCompare,
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
                        totalGasCost + totalGridCost,
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
      .total {
        --mdc-typography-body2-font-weight: 500;
      }
      .total .mdc-data-table__cell {
        border-top: 1px solid var(--divider-color);
      }
      ha-card {
        height: 100%;
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
