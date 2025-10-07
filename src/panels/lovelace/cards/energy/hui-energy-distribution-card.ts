import {
  mdiArrowDown,
  mdiArrowLeft,
  mdiArrowRight,
  mdiArrowUp,
  mdiBatteryHigh,
  mdiFire,
  mdiHome,
  mdiLeaf,
  mdiSolarPower,
  mdiTransmissionTower,
  mdiWater,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  computeConsumptionData,
  energySourcesByType,
  formatConsumptionShort,
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { hasConfigChanged } from "../../common/has-changed";
import type { LovelaceCard } from "../../types";
import type { EnergyDistributionCardConfig } from "../types";

const CIRCLE_CIRCUMFERENCE = 238.76104;

@customElement("hui-energy-distribution-card")
class HuiEnergyDistrubutionCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDistributionCardConfig;

  @state() private _data?: EnergyData;

  @state() private _animate = true;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: EnergyDistributionCardConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass") ||
      (!!this._data?.co2SignalEntity &&
        this.hass.states[this._data.co2SignalEntity] !==
          changedProps.get("hass").states[this._data.co2SignalEntity])
    );
  }

  protected willUpdate() {
    if (!this.hasUpdated && matchMedia("(prefers-reduced-motion)").matches) {
      this._animate = false;
    }
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

    const hasGrid =
      !!types.grid?.[0].flow_from.length || !!types.grid?.[0].flow_to.length;
    const hasSolarProduction = types.solar !== undefined;
    const hasBattery = types.battery !== undefined;
    const hasGas = types.gas !== undefined;
    const hasWater = types.water !== undefined;
    const hasReturnToGrid = !!types.grid?.[0].flow_to.length;

    const { summedData, compareSummedData: _ } = getSummedData(this._data);
    const { consumption, compareConsumption: __ } = computeConsumptionData(
      summedData,
      undefined
    );

    const totalFromGrid = summedData.total.from_grid ?? 0;

    let waterUsage: number | null = null;
    if (hasWater) {
      waterUsage =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.water!.map((source) => source.stat_energy_from)
        ) ?? 0;
    }

    let gasUsage: number | null = null;
    if (hasGas) {
      gasUsage =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.gas!.map((source) => source.stat_energy_from)
        ) ?? 0;
    }

    let totalSolarProduction: number | null = null;

    if (hasSolarProduction) {
      totalSolarProduction = summedData.total.solar ?? 0;
    }

    let totalBatteryIn: number | null = null;
    let totalBatteryOut: number | null = null;

    if (hasBattery) {
      totalBatteryIn = summedData.total.to_battery ?? 0;
      totalBatteryOut = summedData.total.from_battery ?? 0;
    }

    let returnedToGrid: number | null = null;

    if (hasReturnToGrid) {
      returnedToGrid = summedData.total.to_grid ?? 0;
    }

    let solarConsumption: number | null = null;
    if (hasSolarProduction) {
      solarConsumption = consumption.total.used_solar;
    }
    let batteryFromGrid: null | number = null;
    let batteryToGrid: null | number = null;
    if (hasBattery && hasGrid) {
      batteryToGrid = consumption.total.battery_to_grid;
      batteryFromGrid = consumption.total.grid_to_battery;
    }

    let solarToBattery: null | number = null;
    let solarToGrid: null | number = null;
    if (hasSolarProduction && hasGrid) {
      solarToGrid = consumption.total.solar_to_grid;
    }
    if (hasSolarProduction && hasBattery) {
      solarToBattery = consumption.total.solar_to_battery;
    }

    let batteryConsumption: number | null = null;
    if (hasBattery) {
      batteryConsumption = Math.max(consumption.total.used_battery, 0);
    }

    const gridConsumption = hasGrid
      ? Math.max(consumption.total.used_grid, 0)
      : 0;

    const totalHomeConsumption = Math.max(0, consumption.total.used_total);

    let homeSolarCircumference: number | undefined;
    if (hasSolarProduction) {
      homeSolarCircumference =
        CIRCLE_CIRCUMFERENCE * (solarConsumption! / totalHomeConsumption);
    }

    let homeBatteryCircumference: number | undefined;
    if (batteryConsumption) {
      homeBatteryCircumference =
        CIRCLE_CIRCUMFERENCE * (batteryConsumption / totalHomeConsumption);
    }

    let lowCarbonEnergy: number | undefined;

    let homeLowCarbonCircumference: number | undefined;
    let homeHighCarbonCircumference: number | undefined;

    // This fallback is used in the demo
    let electricityMapUrl = "https://app.electricitymaps.com";

    if (
      hasGrid &&
      this._data.co2SignalEntity &&
      this._data.fossilEnergyConsumption
    ) {
      // Calculate high carbon consumption
      const highCarbonEnergy = Object.values(
        this._data.fossilEnergyConsumption
      ).reduce((sum, a) => sum + a, 0);

      const co2State = this.hass.states[this._data.co2SignalEntity];

      if (co2State?.attributes.country_code) {
        electricityMapUrl += `/zone/${co2State.attributes.country_code}`;
      }

      if (highCarbonEnergy !== null) {
        lowCarbonEnergy = totalFromGrid - highCarbonEnergy;

        let highCarbonConsumption: number;
        if (gridConsumption !== totalFromGrid) {
          // Only get the part that was used for consumption and not the battery
          highCarbonConsumption =
            highCarbonEnergy * (gridConsumption! / totalFromGrid);
        } else {
          highCarbonConsumption = highCarbonEnergy;
        }

        homeHighCarbonCircumference =
          CIRCLE_CIRCUMFERENCE * (highCarbonConsumption / totalHomeConsumption);

        homeLowCarbonCircumference =
          CIRCLE_CIRCUMFERENCE -
          (homeSolarCircumference || 0) -
          (homeBatteryCircumference || 0) -
          homeHighCarbonCircumference;
      }
    }

    const totalLines =
      gridConsumption +
      (solarConsumption || 0) +
      (solarToGrid || 0) +
      (solarToBattery || 0) +
      (batteryConsumption || 0) +
      (batteryFromGrid || 0) +
      (batteryToGrid || 0);

    // Coerce all energy numbers to the same unit (the biggest)
    const maxEnergy = Math.max(
      lowCarbonEnergy || 0,
      totalSolarProduction || 0,
      returnedToGrid || 0,
      totalFromGrid || 0,
      totalHomeConsumption,
      totalBatteryIn || 0,
      totalBatteryOut || 0
    );
    const targetEnergyUnit = formatConsumptionShort(this.hass, maxEnergy, "kWh")
      .split(" ")
      .pop();

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${lowCarbonEnergy !== undefined ||
          hasSolarProduction ||
          hasGas ||
          hasWater
            ? html`<div class="row">
                ${lowCarbonEnergy === undefined
                  ? html`<div class="spacer"></div>`
                  : html`<div class="circle-container low-carbon">
                      <span class="label"
                        >${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_distribution.low_carbon"
                        )}</span
                      >
                      <a
                        class="circle"
                        href=${electricityMapUrl}
                        target="_blank"
                        rel="noopener no referrer"
                      >
                        <ha-svg-icon .path=${mdiLeaf}></ha-svg-icon>
                        ${formatConsumptionShort(
                          this.hass,
                          lowCarbonEnergy,
                          "kWh",
                          targetEnergyUnit
                        )}
                      </a>
                      <svg width="80" height="30">
                        <line x1="40" y1="0" x2="40" y2="30"></line>
                      </svg>
                    </div>`}
                ${hasSolarProduction
                  ? html`<div class="circle-container solar">
                      <span class="label"
                        >${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_distribution.solar"
                        )}</span
                      >
                      <div class="circle">
                        <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
                        ${formatConsumptionShort(
                          this.hass,
                          totalSolarProduction,
                          "kWh",
                          targetEnergyUnit
                        )}
                      </div>
                    </div>`
                  : hasGas || hasWater
                    ? html`<div class="spacer"></div>`
                    : ""}
                ${hasGas
                  ? html`<div class="circle-container gas">
                      <span class="label"
                        >${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_distribution.gas"
                        )}</span
                      >
                      <div class="circle">
                        <ha-svg-icon .path=${mdiFire}></ha-svg-icon>
                        ${formatConsumptionShort(
                          this.hass,
                          gasUsage,
                          this._data.gasUnit
                        )}
                      </div>
                      <svg width="80" height="30">
                        <path d="M40 0 v30" id="gas" />
                        ${gasUsage && this._animate
                          ? svg`<circle
                    r="1"
                    class="gas"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#gas" />
                    </animateMotion>
                  </circle>`
                          : ""}
                      </svg>
                    </div>`
                  : hasWater
                    ? html`<div class="circle-container water">
                        <span class="label"
                          >${this.hass.localize(
                            "ui.panel.lovelace.cards.energy.energy_distribution.water"
                          )}</span
                        >
                        <div class="circle">
                          <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
                          ${formatConsumptionShort(
                            this.hass,
                            waterUsage,
                            this._data.waterUnit
                          )}
                        </div>
                        <svg width="80" height="30">
                          <path d="M40 0 v30" id="water" />
                          ${waterUsage && this._animate
                            ? svg`<circle
                r="1"
                class="water"
                vector-effect="non-scaling-stroke"
              >
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath xlink:href="#water" />
                </animateMotion>
              </circle>`
                            : ""}
                        </svg>
                      </div>`
                    : html`<div class="spacer"></div>`}
              </div>`
            : ""}
          <div class="row">
            ${hasGrid
              ? html`<div class="circle-container grid">
                  <div class="circle">
                    <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
                    ${returnedToGrid !== null
                      ? html`<span class="return">
                          <ha-svg-icon
                            class="small"
                            .path=${mdiArrowLeft}
                          ></ha-svg-icon
                          >${formatConsumptionShort(
                            this.hass,
                            returnedToGrid,
                            "kWh",
                            targetEnergyUnit
                          )}
                        </span>`
                      : ""}
                    <span class="consumption">
                      ${hasReturnToGrid
                        ? html`<ha-svg-icon
                            class="small"
                            .path=${mdiArrowRight}
                          ></ha-svg-icon>`
                        : ""}${formatConsumptionShort(
                        this.hass,
                        totalFromGrid,
                        "kWh",
                        targetEnergyUnit
                      )}
                    </span>
                  </div>
                  <span class="label"
                    >${this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_distribution.grid"
                    )}</span
                  >
                </div> `
              : html`<div class="grid-spacer"></div>`}
            <div class="circle-container home">
              <div
                class="circle ${classMap({
                  border:
                    homeSolarCircumference === undefined &&
                    homeLowCarbonCircumference === undefined,
                })}"
              >
                <ha-svg-icon .path=${mdiHome}></ha-svg-icon>
                ${formatConsumptionShort(
                  this.hass,
                  totalHomeConsumption,
                  "kWh",
                  targetEnergyUnit
                )}
                ${homeSolarCircumference !== undefined ||
                homeLowCarbonCircumference !== undefined
                  ? html`<svg>
                      ${homeSolarCircumference !== undefined
                        ? svg`<circle
                            class="solar"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeSolarCircumference} ${
                              CIRCLE_CIRCUMFERENCE - homeSolarCircumference
                            }"
                            shape-rendering="geometricPrecision"
                            stroke-dashoffset="-${
                              CIRCLE_CIRCUMFERENCE - homeSolarCircumference
                            }"
                          />`
                        : ""}
                      ${homeBatteryCircumference
                        ? svg`<circle
                            class="battery"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeBatteryCircumference} ${
                              CIRCLE_CIRCUMFERENCE - homeBatteryCircumference
                            }"
                            stroke-dashoffset="-${
                              CIRCLE_CIRCUMFERENCE -
                              homeBatteryCircumference -
                              (homeSolarCircumference || 0)
                            }"
                            shape-rendering="geometricPrecision"
                          />`
                        : ""}
                      ${homeLowCarbonCircumference
                        ? svg`<circle
                            class="low-carbon"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeLowCarbonCircumference} ${
                              CIRCLE_CIRCUMFERENCE - homeLowCarbonCircumference
                            }"
                            stroke-dashoffset="-${
                              CIRCLE_CIRCUMFERENCE -
                              homeLowCarbonCircumference -
                              (homeBatteryCircumference || 0) -
                              (homeSolarCircumference || 0)
                            }"
                            shape-rendering="geometricPrecision"
                          />`
                        : ""}
                      ${hasGrid
                        ? svg`<circle
                        class="grid"
                        cx="40"
                        cy="40"
                        r="38"
                        stroke-dasharray="${
                          homeHighCarbonCircumference ??
                          CIRCLE_CIRCUMFERENCE -
                            homeSolarCircumference! -
                            (homeBatteryCircumference || 0)
                        } ${
                          homeHighCarbonCircumference !== undefined
                            ? CIRCLE_CIRCUMFERENCE - homeHighCarbonCircumference
                            : homeSolarCircumference! +
                              (homeBatteryCircumference || 0)
                        }"
                        stroke-dashoffset="0"
                        shape-rendering="geometricPrecision"
                      />`
                        : nothing}
                    </svg>`
                  : ""}
              </div>
              ${hasGas && hasWater
                ? ""
                : html`<span class="label"
                    >${this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_distribution.home"
                    )}</span
                  >`}
            </div>
          </div>
          ${hasBattery || (hasGas && hasWater)
            ? html`<div class="row">
                <div class="spacer"></div>
                ${hasBattery
                  ? html` <div class="circle-container battery">
                      <div class="circle">
                        <ha-svg-icon .path=${mdiBatteryHigh}></ha-svg-icon>
                        <span class="battery-in">
                          <ha-svg-icon
                            class="small"
                            .path=${mdiArrowDown}
                          ></ha-svg-icon
                          >${formatConsumptionShort(
                            this.hass,
                            totalBatteryIn,
                            "kWh",
                            targetEnergyUnit
                          )}
                        </span>
                        <span class="battery-out">
                          <ha-svg-icon
                            class="small"
                            .path=${mdiArrowUp}
                          ></ha-svg-icon
                          >${formatConsumptionShort(
                            this.hass,
                            totalBatteryOut,
                            "kWh",
                            targetEnergyUnit
                          )}
                        </span>
                      </div>
                      <span class="label"
                        >${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_distribution.battery"
                        )}</span
                      >
                    </div>`
                  : html`<div class="spacer"></div>`}
                ${hasGas && hasWater
                  ? html`<div class="circle-container water bottom">
                      <svg width="80" height="30">
                        <path d="M40 30 v-30" id="water" />
                        ${waterUsage && this._animate
                          ? svg`<circle
                    r="1"
                    class="water"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#water" />
                    </animateMotion>
                  </circle>`
                          : ""}
                      </svg>
                      <div class="circle">
                        <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
                        ${formatConsumptionShort(
                          this.hass,
                          waterUsage,
                          this._data.waterUnit
                        )}
                      </div>
                      <span class="label"
                        >${this.hass.localize(
                          "ui.panel.lovelace.cards.energy.energy_distribution.water"
                        )}</span
                      >
                    </div>`
                  : html`<div class="spacer"></div>`}
              </div>`
            : ""}
          <div
            class="lines ${classMap({
              high: hasBattery || (hasGas && hasWater),
            })}"
          >
            <svg
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              ${hasReturnToGrid && hasSolarProduction
                ? svg`<path
                    id="return"
                    class="return"
                    d="M${hasBattery ? 45 : 47},0 v15 c0,${
                      hasBattery ? "35 -10,30 -30,30" : "40 -10,35 -30,35"
                    } h-20"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                : ""}
              ${hasSolarProduction
                ? svg`<path
                    id="solar"
                    class="solar"
                    d="M${hasBattery ? 55 : 53},0 v15 c0,${
                      hasBattery ? "35 10,30 30,30" : "40 10,35 30,35"
                    } h20"
                    vector-effect="non-scaling-stroke"
                  ></path>`
                : ""}
              ${hasBattery
                ? svg`<path
                    id="battery-house"
                    class="battery-house"
                    d="M55,100 v-15 c0,-35 10,-30 30,-30 h20"
                    vector-effect="non-scaling-stroke"
                  ></path>
                  ${
                    hasGrid
                      ? svg`<path
                          id="battery-grid"
                          class=${classMap({
                            "battery-from-grid": Boolean(batteryFromGrid),
                            "battery-to-grid": Boolean(batteryToGrid),
                          })}
                          d="M45,100 v-15 c0,-35 -10,-30 -30,-30 h-20"
                          vector-effect="non-scaling-stroke"
                        ></path>`
                      : nothing
                  }
                  `
                : ""}
              ${hasBattery && hasSolarProduction
                ? svg`<path
                    id="battery-solar"
                    class="battery-solar"
                    d="M50,0 V100"
                    vector-effect="non-scaling-stroke"
                  ></path>`
                : ""}
              ${hasGrid
                ? svg`<path
                    class="grid"
                    id="grid"
                    d="M0,${hasBattery ? 50 : hasSolarProduction ? 56 : 53} H100"
                    vector-effect="non-scaling-stroke"
              ></path>`
                : nothing}
              ${solarToGrid && this._animate
                ? svg`<circle
                    r="1"
                    class="return"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (solarToGrid / totalLines) * 6}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#return" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${solarConsumption && this._animate
                ? svg`<circle
                    r="1"
                    class="solar"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (solarConsumption / totalLines) * 5}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#solar" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${gridConsumption && this._animate
                ? svg`<circle
                    r="1"
                    class="grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (gridConsumption / totalLines) * 5}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#grid" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${solarToBattery && this._animate
                ? svg`<circle
                    r="1"
                    class="battery-solar"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (solarToBattery / totalLines) * 5}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#battery-solar" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${batteryConsumption && this._animate
                ? svg`<circle
                    r="1"
                    class="battery-house"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (batteryConsumption / totalLines) * 5}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#battery-house" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${batteryFromGrid && this._animate
                ? svg`<circle
                    r="1"
                    class="battery-from-grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (batteryFromGrid / totalLines) * 5}s"
                      repeatCount="indefinite"
                      keyPoints="1;0" keyTimes="0;1"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#battery-grid" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${batteryToGrid && this._animate
                ? svg`<circle
                    r="1"
                    class="battery-to-grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${6 - (batteryToGrid / totalLines) * 5}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#battery-grid" />
                    </animateMotion>
                  </circle>`
                : ""}
            </svg>
          </div>
        </div>
        ${this._config.link_dashboard
          ? html`
              <div class="card-actions">
                <ha-button appearance="plain" size="small" href="/energy">
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard"
                  )}
                </ha-button>
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --mdc-icon-size: 24px;
    }
    ha-card {
      min-width: 210px;
    }
    .card-content {
      position: relative;
      direction: ltr;
    }
    .lines {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 146px;
      display: flex;
      justify-content: center;
      padding: 0 16px 16px;
      box-sizing: border-box;
    }
    .lines.high {
      bottom: 100px;
      height: 156px;
    }
    .lines svg {
      width: calc(100% - 160px);
      height: 100%;
      max-width: 340px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      max-width: 500px;
      margin: 0 auto;
    }
    .circle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .circle-container.low-carbon {
      margin-right: 4px;
    }
    .circle-container.solar {
      margin: 0 4px;
      height: 130px;
    }
    .circle-container.gas {
      margin-left: 4px;
      height: 130px;
    }
    .circle-container.water {
      margin-left: 4px;
      height: 130px;
    }
    .circle-container.water.bottom {
      position: relative;
      top: -20px;
      margin-bottom: -20px;
    }
    .circle-container.battery {
      height: 110px;
      justify-content: flex-end;
    }
    .spacer {
      width: 84px;
    }
    .grid-spacer {
      width: 84px;
      height: 100px;
    }
    .circle {
      width: 80px;
      height: 80px;
      border-radius: var(--ha-border-radius-circle);
      box-sizing: border-box;
      border: 2px solid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: var(--ha-font-size-s);
      line-height: 12px;
      position: relative;
      text-decoration: none;
      color: var(--primary-text-color);
    }
    ha-svg-icon {
      padding-bottom: 2px;
    }
    ha-svg-icon.small {
      --mdc-icon-size: 12px;
    }
    .label {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      opacity: 1;
      height: 20px;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
      white-space: nowrap;
    }
    line,
    path {
      stroke: var(--primary-text-color);
      stroke-width: 1;
      fill: none;
    }
    .circle svg {
      position: absolute;
      fill: none;
      stroke-width: 4px;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
    }
    .gas path,
    .gas circle {
      stroke: var(--energy-gas-color);
    }
    circle.gas {
      stroke-width: 4;
      fill: var(--energy-gas-color);
    }
    .gas .circle {
      border-color: var(--energy-gas-color);
    }
    .water path,
    .water circle {
      stroke: var(--energy-water-color);
    }
    circle.water {
      stroke-width: 4;
      fill: var(--energy-water-color);
    }
    .water .circle {
      border-color: var(--energy-water-color);
    }
    .low-carbon line {
      stroke: var(--energy-non-fossil-color);
    }
    .low-carbon .circle {
      border-color: var(--energy-non-fossil-color);
    }
    .low-carbon ha-svg-icon {
      color: var(--energy-non-fossil-color);
    }
    circle.low-carbon {
      stroke: var(--energy-non-fossil-color);
      fill: var(--energy-non-fossil-color);
    }
    .solar .circle {
      border-color: var(--energy-solar-color);
    }
    circle.solar,
    path.solar {
      stroke: var(--energy-solar-color);
    }
    circle.solar {
      stroke-width: 4;
      fill: var(--energy-solar-color);
    }
    .battery .circle {
      border-color: var(--energy-battery-in-color);
    }
    circle.battery,
    path.battery {
      stroke: var(--energy-battery-out-color);
    }
    path.battery-house,
    circle.battery-house {
      stroke: var(--energy-battery-out-color);
    }
    circle.battery-house {
      stroke-width: 4;
      fill: var(--energy-battery-out-color);
    }
    path.battery-solar,
    circle.battery-solar {
      stroke: var(--energy-battery-in-color);
    }
    circle.battery-solar {
      stroke-width: 4;
      fill: var(--energy-battery-in-color);
    }
    .battery-in {
      color: var(--energy-battery-in-color);
    }
    .battery-out {
      color: var(--energy-battery-out-color);
    }
    path.battery-from-grid {
      stroke: var(--energy-grid-consumption-color);
    }
    path.battery-to-grid {
      stroke: var(--energy-grid-return-color);
    }
    path.return,
    circle.return,
    circle.battery-to-grid {
      stroke: var(--energy-grid-return-color);
    }
    circle.return,
    circle.battery-to-grid {
      stroke-width: 4;
      fill: var(--energy-grid-return-color);
    }
    .return {
      color: var(--energy-grid-return-color);
    }
    .grid .circle {
      border-color: var(--energy-grid-consumption-color);
    }
    .consumption {
      color: var(--energy-grid-consumption-color);
    }
    circle.grid,
    circle.battery-from-grid,
    path.grid {
      stroke: var(--energy-grid-consumption-color);
    }
    circle.grid,
    circle.battery-from-grid {
      stroke-width: 4;
      fill: var(--energy-grid-consumption-color);
    }
    .home .circle {
      border-width: 0;
      border-color: var(--primary-color);
    }
    .home .circle.border {
      border-width: 2px;
    }
    .circle svg circle {
      fill: none;
    }
    @media not (prefers-reduced-motion) {
      .circle svg circle {
        animation: rotate-in 0.6s ease-in;
        transition:
          stroke-dashoffset 0.4s,
          stroke-dasharray 0.4s;
      }
      @keyframes rotate-in {
        from {
          stroke-dashoffset: 238.76104;
          stroke-dasharray: 238.76104;
        }
      }
    }
    .card-actions a {
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-distribution-card": HuiEnergyDistrubutionCard;
  }
}
