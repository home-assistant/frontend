import {
  mdiArrowDown,
  mdiArrowLeft,
  mdiArrowRight,
  mdiArrowUp,
  mdiBatteryHigh,
  mdiCarElectric,
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
import { batteryLevelIconPath } from "../../../../common/entity/battery_icon";
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
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { hasConfigChanged } from "../../common/has-changed";
import type { LovelaceCard } from "../../types";
import type { EnergyDistributionCardConfig } from "../types";
import { formatNumber } from "../../../../common/number/format_number";

const CIRCLE_CIRCUMFERENCE = 238.76104;

// Consumer group box geometry, mirrored by .consumer-group in the styles.
// The stroked path is inset by half the 2px stroke, so it is a
// 94x220 rounded rect with a 15px radius.
const CONSUMER_GROUP_WIDTH = 96;
const CONSUMER_GROUP_HEIGHT = 222;
const CONSUMER_GROUP_RADIUS = 15;

const periodIncludesNow = (data: EnergyData): boolean =>
  !data.end || data.end.getTime() >= Date.now();

@customElement("hui-energy-distribution-card")
class HuiEnergyDistrubutionCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDistributionCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyDistributionCardConfig {
    return {
      type: "energy-distribution",
    };
  }

  @state() private _data?: EnergyData;

  @state() private _animate = true;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public setConfig(config: EnergyDistributionCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
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

  /**
   * The EV circle, rendered directly below home so the consumer group box can
   * enclose the two of them.
   *
   * It deliberately has no connector of its own: the EV is a consumer
   * alongside home rather than a sub-item of it, and the group box is what
   * carries that relationship. The supply lines stop at the box edge.
   */
  private _renderEvCircle(
    evConsumption: number,
    targetEnergyUnit: string | undefined,
    evSolarCircumference: number | undefined,
    evBatteryCircumference: number | undefined,
    evGridCircumference: number | undefined
  ) {
    const hasRing =
      evSolarCircumference !== undefined ||
      evBatteryCircumference !== undefined ||
      evGridCircumference !== undefined;
    return html`<div class="circle-container ev bottom">
      <div class="circle ${classMap({ border: !hasRing })}">
        <ha-svg-icon .path=${mdiCarElectric}></ha-svg-icon>
        ${formatConsumptionShort(
          this.hass,
          evConsumption,
          "kWh",
          targetEnergyUnit
        )}
        ${
          hasRing
            ? html`<svg>
                ${
                  evSolarCircumference !== undefined
                    ? svg`<circle
                    class="solar"
                    cx="40"
                    cy="40"
                    r="38"
                    stroke-dasharray="${evSolarCircumference} ${
                      CIRCLE_CIRCUMFERENCE - evSolarCircumference
                    }"
                    shape-rendering="geometricPrecision"
                    stroke-dashoffset="-${
                      CIRCLE_CIRCUMFERENCE - evSolarCircumference
                    }"
                  />`
                    : ""
                }
                ${
                  evBatteryCircumference
                    ? svg`<circle
                    class="battery"
                    cx="40"
                    cy="40"
                    r="38"
                    stroke-dasharray="${evBatteryCircumference} ${
                      CIRCLE_CIRCUMFERENCE - evBatteryCircumference
                    }"
                    stroke-dashoffset="-${
                      CIRCLE_CIRCUMFERENCE -
                      evBatteryCircumference -
                      (evSolarCircumference || 0)
                    }"
                    shape-rendering="geometricPrecision"
                  />`
                    : ""
                }
                ${
                  evGridCircumference
                    ? svg`<circle
                    class="grid"
                    cx="40"
                    cy="40"
                    r="38"
                    stroke-dasharray="${evGridCircumference} ${
                      CIRCLE_CIRCUMFERENCE - evGridCircumference
                    }"
                    stroke-dashoffset="-${
                      CIRCLE_CIRCUMFERENCE -
                      evGridCircumference -
                      (evBatteryCircumference || 0) -
                      (evSolarCircumference || 0)
                    }"
                    shape-rendering="geometricPrecision"
                  />`
                    : ""
                }
              </svg>`
            : ""
        }
      </div>
      <span class="label"
        >${this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.ev"
        )}</span
      >
    </div>`;
  }

  /**
   * The water circle in its "below home" position, with its feed line.
   *
   * `crossesGroup` is true when the EV is also present: the water row then
   * sits below the consumer group box instead of directly below home, so its
   * feed line has to stop at the box's border rather than reach all the way
   * up to the home circle - otherwise it visually runs into the EV circle,
   * which water does not feed.
   */
  private _renderBottomWaterCircle(
    waterUsage: number | null,
    crossesGroup: boolean
  ) {
    return html`<div
      class="circle-container water bottom ${classMap({ "crosses-group": crossesGroup })}"
    >
      <svg width="80" height="30">
        <path d="M40 30 v-${crossesGroup ? 22 : 30}" id="water" />
        ${
          waterUsage && this._animate
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
            : ""
        }
      </svg>
      <div class="circle">
        <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
        ${formatConsumptionShort(this.hass, waterUsage, this._data!.waterUnit)}
      </div>
      <span class="label"
        >${this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.water"
        )}</span
      >
    </div>`;
  }

  private get _energyDashboardHref(): string {
    const params = new URLSearchParams({
      historyBack: "1",
    });
    const backPath = window.location.pathname;
    if (backPath) {
      params.append("backPath", backPath);
    }
    return `/energy?${params.toString()}`;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    ) {
      return true;
    }
    const oldStates = changedProps.get("hass").states;
    if (
      this._data?.co2SignalEntity &&
      this.hass.states[this._data.co2SignalEntity] !==
        oldStates[this._data.co2SignalEntity]
    ) {
      return true;
    }
    if (this._data && periodIncludesNow(this._data)) {
      const batteries = energySourcesByType(this._data.prefs).battery;
      if (
        batteries?.some(
          (source) =>
            source.stat_soc &&
            this.hass.states[source.stat_soc] !== oldStates[source.stat_soc]
        )
      ) {
        return true;
      }
    }
    return false;
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

    const hasGrid = types.grid?.some(
      (g) => g.stat_energy_from || g.stat_energy_to
    );
    const hasSolarProduction = types.solar !== undefined;
    const hasBattery = types.battery !== undefined;
    // EV is a consumer, deducted from home and drawn as its own node.
    const hasEv = types.ev !== undefined;
    const hasGas = types.gas !== undefined;
    const hasWater = types.water !== undefined;
    const hasReturnToGrid =
      types.grid?.some((source) => source.stat_energy_to) ?? false;

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
    let batteryIconPath = mdiBatteryHigh;
    let averageBatterySoc: number | null = null;

    if (hasBattery) {
      totalBatteryIn = summedData.total.to_battery ?? 0;
      totalBatteryOut = summedData.total.from_battery ?? 0;

      // The SOC reflects the current battery level, so it only matches the
      // card's data when the selected period extends to now. For historical
      // periods (yesterday, last week, ...) fall back to the generic icon.
      if (periodIncludesNow(this._data)) {
        const socBatteries = types
          .battery!.map((source) => ({
            soc: source.stat_soc
              ? Number(this.hass.states[source.stat_soc]?.state)
              : NaN,
            capacity: source.capacity,
          }))
          .filter((battery) => Number.isFinite(battery.soc));
        if (socBatteries.length) {
          // Weight each battery's SOC by its capacity so the combined value
          // reflects the total stored energy. Batteries without a configured
          // capacity assume the mean of the configured ones; when none are
          // configured this falls back to an equally weighted (simple) average.
          const configuredCapacities = socBatteries
            .map((battery) => battery.capacity)
            .filter((capacity) => capacity != null && capacity > 0) as number[];
          const meanCapacity = configuredCapacities.length
            ? configuredCapacities.reduce((sum, value) => sum + value, 0) /
              configuredCapacities.length
            : 1;
          let weightSum = 0;
          let weightedSocSum = 0;
          socBatteries.forEach((battery) => {
            const capacity =
              battery.capacity != null && battery.capacity > 0
                ? battery.capacity
                : meanCapacity;
            weightSum += capacity;
            weightedSocSum += battery.soc * capacity;
          });
          averageBatterySoc = weightedSocSum / weightSum;
          batteryIconPath = batteryLevelIconPath(averageBatterySoc);
        }
      }
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

    const evConsumption = Math.max(0, consumption.total.used_ev);

    const totalHomeConsumption = Math.max(0, consumption.total.used_home);

    // Home and EV each draw their own source-mix ring on their own circle,
    // from their own split of solar/battery/grid - the consumer group box
    // (when an EV is split out) is just a plain grouping border, not a third
    // mix of its own.
    const ringLength = CIRCLE_CIRCUMFERENCE;
    const ringTotal = totalHomeConsumption;
    const ringSolar = solarConsumption;
    const ringBattery = batteryConsumption;
    const ringGrid = gridConsumption;

    let homeSolarCircumference: number | undefined;
    if (hasSolarProduction) {
      homeSolarCircumference = ringLength * (ringSolar! / ringTotal);
    }

    let homeBatteryCircumference: number | undefined;
    if (ringBattery) {
      homeBatteryCircumference = ringLength * (ringBattery / ringTotal);
    }

    // EV's own ring, mirroring Home's above but off the EV's split of the
    // same sources. Kept to solar/battery/grid (no low-carbon/high-carbon
    // split - that nuance is only meaningful for Home's ring below).
    let evSolarCircumference: number | undefined;
    let evBatteryCircumference: number | undefined;
    let evGridCircumference: number | undefined;
    if (hasEv && evConsumption > 0) {
      const evSolar = Math.max(0, consumption.total.ev_solar);
      const evBattery = Math.max(0, consumption.total.ev_battery);
      if (hasSolarProduction) {
        evSolarCircumference = CIRCLE_CIRCUMFERENCE * (evSolar / evConsumption);
      }
      if (evBattery) {
        evBatteryCircumference =
          CIRCLE_CIRCUMFERENCE * (evBattery / evConsumption);
      }
      if (hasGrid) {
        evGridCircumference =
          CIRCLE_CIRCUMFERENCE -
          (evSolarCircumference || 0) -
          (evBatteryCircumference || 0);
      }
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
        if (ringGrid !== totalFromGrid) {
          // Only get the part that was used for consumption and not the battery
          highCarbonConsumption =
            highCarbonEnergy * (ringGrid! / totalFromGrid);
        } else {
          highCarbonConsumption = highCarbonEnergy;
        }

        homeHighCarbonCircumference =
          ringLength * (highCarbonConsumption / ringTotal);

        homeLowCarbonCircumference =
          ringLength -
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
      evConsumption,
      totalBatteryIn || 0,
      totalBatteryOut || 0
    );
    const targetEnergyUnit = formatConsumptionShort(this.hass, maxEnergy, "kWh")
      .split(" ")
      .pop();

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${
            lowCarbonEnergy !== undefined ||
            hasSolarProduction ||
            hasGas ||
            hasWater
              ? html`<div class="row">
                  ${
                    lowCarbonEnergy === undefined
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
                            rel="noopener noreferrer"
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
                        </div>`
                  }
                  ${
                    hasSolarProduction
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
                        : ""
                  }
                  ${
                    hasGas
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
                            <path d="M40 0 v${hasEv ? 22 : 30}" id="gas" />
                            ${
                              gasUsage && this._animate
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
                                : ""
                            }
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
                              <path d="M40 0 v${hasEv ? 22 : 30}" id="water" />
                              ${
                                waterUsage && this._animate
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
                                  : ""
                              }
                            </svg>
                          </div>`
                        : html`<div class="spacer"></div>`
                  }
                </div>`
              : ""
          }
          <div class="row">
            ${
              hasGrid
                ? html`<div class="circle-container grid">
                    <div class="circle">
                      <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
                      ${
                        returnedToGrid !== null
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
                          : ""
                      }
                      <span class="consumption">
                        ${
                          hasReturnToGrid
                            ? html`<ha-svg-icon
                                class="small"
                                .path=${mdiArrowRight}
                              ></ha-svg-icon>`
                            : ""
                        }${formatConsumptionShort(
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
                : html`<div class="grid-spacer"></div>`
            }
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
                ${
                  homeSolarCircumference !== undefined ||
                  homeLowCarbonCircumference !== undefined
                    ? html`<svg>
                        ${
                          homeSolarCircumference !== undefined
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
                            : ""
                        }
                        ${
                          homeBatteryCircumference
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
                            : ""
                        }
                        ${
                          homeLowCarbonCircumference
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
                            : ""
                        }
                        ${
                          hasGrid
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
                            : nothing
                        }
                      </svg>`
                    : ""
                }
              </div>
              ${
                hasGas && hasWater && !hasEv
                  ? ""
                  : html`<span class="label"
                      >${this.hass.config.location_name}</span
                    >`
              }
            </div>
          </div>
          ${
            hasBattery || hasEv || (hasGas && hasWater)
              ? html`<div class="row">
                  <div class="spacer"></div>
                  ${
                    hasBattery
                      ? html` <div class="circle-container battery">
                          <div class="circle">
                            <div class="battery-soc">
                              <ha-svg-icon
                                .path=${batteryIconPath}
                              ></ha-svg-icon>
                              ${
                                averageBatterySoc !== null
                                  ? html`<span
                                      >${formatNumber(
                                        averageBatterySoc,
                                        this.hass.locale,
                                        {
                                          maximumFractionDigits: 0,
                                        }
                                      )}
                                      %</span
                                    >`
                                  : nothing
                              }
                            </div>
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
                      : html`<div class="spacer"></div>`
                  }
                  ${
                    // The EV must sit directly under home so the group box can
                    // enclose the two of them and nothing else. Water, being a
                    // source, is pushed to its own row below the box.
                    hasEv
                      ? this._renderEvCircle(
                          evConsumption,
                          targetEnergyUnit,
                          evSolarCircumference,
                          evBatteryCircumference,
                          evGridCircumference
                        )
                      : hasGas && hasWater
                        ? this._renderBottomWaterCircle(waterUsage, false)
                        : html`<div class="spacer"></div>`
                  }
                </div>`
              : ""
          }
          ${
            hasEv && hasGas && hasWater
              ? html`<div class="row">
                  <div class="spacer"></div>
                  <div class="spacer"></div>
                  ${this._renderBottomWaterCircle(waterUsage, true)}
                </div>`
              : ""
          }
          ${
            // Encloses home and the EV so they read as two consumers of the
            // same supply. The electricity lines stop at its edge; gas and
            // water cross it, because they feed the home only.
            hasEv
              ? html`<div
                  class="consumer-group-wrap ${classMap({
                    // A water row below the box pushes the card's bottom edge
                    // down; both this and .lines are bottom-anchored, so they
                    // have to be lifted by that row's height.
                    "above-water-row": hasGas && hasWater,
                  })}"
                >
                  <div class="consumer-group-row">
                    <div class="consumer-group">
                      <svg
                        width=${CONSUMER_GROUP_WIDTH}
                        height=${CONSUMER_GROUP_HEIGHT}
                        viewBox="0 0 ${CONSUMER_GROUP_WIDTH} ${CONSUMER_GROUP_HEIGHT}"
                      >
                        ${svg`<rect
                          class="track"
                          x="1"
                          y="1"
                          width="${CONSUMER_GROUP_WIDTH - 2}"
                          height="${CONSUMER_GROUP_HEIGHT - 2}"
                          rx="${CONSUMER_GROUP_RADIUS}"
                        />`}
                      </svg>
                    </div>
                  </div>
                </div>`
              : nothing
          }
          <div
            class="lines ${classMap({
              high: hasBattery || hasEv || (hasGas && hasWater),
              "above-water-row": hasEv && hasGas && hasWater,
              "with-consumer-group": hasEv,
            })}"
          >
            <svg
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              ${
                hasReturnToGrid && hasSolarProduction
                  ? svg`<path
                    id="return"
                    class="return"
                    d="M${hasBattery ? 45 : 47},0 v15 c0,${
                      hasBattery ? "35 -10,30 -30,30" : "40 -10,35 -30,35"
                    } h-20"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                  : ""
              }
              ${
                hasSolarProduction
                  ? svg`<path
                    id="solar"
                    class="solar"
                    d="M${hasBattery ? 55 : 53},0 v15 c0,${
                      hasBattery ? "35 10,30 30,30" : "40 10,35 30,35"
                    } h${hasEv ? 15 : 20}"
                    vector-effect="non-scaling-stroke"
                  ></path>`
                  : ""
              }
              ${
                hasBattery
                  ? svg`<path
                    id="battery-house"
                    class="battery-house"
                    d="M55,100 v-15 c0,-35 10,-30 30,-30 h${hasEv ? 15 : 20}"
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
                  : ""
              }
              ${
                hasBattery && hasSolarProduction
                  ? svg`<path
                    id="battery-solar"
                    class="battery-solar"
                    d="M50,0 V100"
                    vector-effect="non-scaling-stroke"
                  ></path>`
                  : ""
              }
              ${
                hasGrid
                  ? svg`<path
                    class="grid"
                    id="grid"
                    d="M0,${hasBattery ? 50 : hasSolarProduction ? 56 : 53} H100"
                    vector-effect="non-scaling-stroke"
              ></path>`
                  : nothing
              }
              ${
                solarToGrid && this._animate
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
                  : ""
              }
              ${
                solarConsumption && this._animate
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
                  : ""
              }
              ${
                gridConsumption && this._animate
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
                  : ""
              }
              ${
                solarToBattery && this._animate
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
                  : ""
              }
              ${
                batteryConsumption && this._animate
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
                  : ""
              }
              ${
                batteryFromGrid && this._animate
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
                  : ""
              }
              ${
                batteryToGrid && this._animate
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
                  : ""
              }
            </svg>
          </div>
        </div>
        ${
          this._config.link_dashboard && this.hass.panels.energy
            ? html`
                <div class="card-actions">
                  <ha-button
                    appearance="plain"
                    size="s"
                    href=${this._energyDashboardHref}
                  >
                    ${this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard"
                    )}
                  </ha-button>
                </div>
              `
            : ""
        }
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
    .lines.high.above-water-row {
      bottom: 210px;
    }
    /* Mirrors .row's centering so the box lands on the right-hand column
       without hardcoding any horizontal offset. */
    /* The box sits CONSUMER_GROUP_PADDING px outside the home and EV circles.
       Everything that has to meet its border is offset by that same amount in
       CSS pixels - never in viewBox units, since a unit is 1.8-3.4px depending
       on card width. */
    .consumer-group-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 12px;
      height: 222px;
      /* Same horizontal padding as .lines so this lines up with .row, which
         is laid out inside the card's content padding. */
      padding: 0 16px;
      box-sizing: border-box;
      pointer-events: none;
    }
    .consumer-group-wrap.above-water-row {
      bottom: 122px;
    }
    .consumer-group-row {
      display: flex;
      justify-content: flex-end;
      max-width: 500px;
      height: 100%;
      margin: 0 auto;
    }
    .consumer-group {
      box-sizing: border-box;
      /* 80px circle + 8px padding each side. Mirrors CONSUMER_GROUP_WIDTH /
         CONSUMER_GROUP_HEIGHT. */
      width: 96px;
      height: 100%;
      margin-right: -8px;
    }
    /* A plain grouping border around Home and EV - each of them draws its
       own source-mix ring on its own circle instead. */
    .consumer-group rect {
      fill: none;
      stroke-width: 2;
    }
    .consumer-group rect.track {
      stroke: var(--divider-color);
    }
    .lines svg {
      width: calc(100% - 160px);
      height: 100%;
      max-width: 340px;
    }
    /* The svg keeps its exact original geometry - x=0 on the grid circle, x=50
       on the card's centre line (so the vertical solar/battery lines stay
       centred on those circles), x=100 on the home circle. Resizing it to reach
       the box border would move x=50 off centre, so instead the last 8px are
       simply not painted, which lands the horizontal lines on the box border
       without disturbing any coordinate. Clipping is in px, so it holds at any
       card width. */
    .lines.with-consumer-group svg {
      clip-path: inset(0 8px 0 0);
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
    /* With the EV present, this row sits below the consumer group box
       instead of directly below home. Mirrors how the gas circle above the
       box is positioned: the svg's unpainted portion (the 8px the path
       stops short of, see the v-22/v-30 above) overlaps into the box and
       stays hidden there, while the painted 22px runs from the box's border
       down to the water circle - so the line reads as stopping at the box,
       the same way it stops at home when there's no EV.
       Only "top" is changed here: it is a paint-time offset that doesn't
       reserve extra flow space, so it can't push .consumer-group-wrap's
       bottom-anchored position around. margin-bottom must stay exactly what
       the base rule sets - changing it resizes this row's box in the flow,
       which shifts the anchor for the box below it and, in turn, the group
       box itself. */
    .circle-container.water.bottom.crosses-group {
      top: -5px;
    }
    .circle-container.ev {
      margin-left: 4px;
      height: 110px;
      justify-content: flex-end;
    }
    .circle-container.battery {
      height: 110px;
      justify-content: flex-end;
    }
    .battery-soc {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--ha-font-size-s);
      line-height: 1.2;
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
    .ev path,
    .ev circle {
      stroke: var(--energy-ev-color);
    }
    circle.ev {
      stroke-width: 4;
      fill: var(--energy-ev-color);
    }
    .ev .circle {
      border-width: 0;
      border-color: var(--energy-ev-color);
    }
    .ev .circle.border {
      border-width: 2px;
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
      border-color: var(--energy-battery-out-color);
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
