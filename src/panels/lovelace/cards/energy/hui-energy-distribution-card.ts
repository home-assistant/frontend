import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiHome,
  mdiLeaf,
  mdiSolarPower,
  mdiTransmissionTower,
} from "@mdi/js";
import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { formatNumber } from "../../../../common/string/format_number";
import { subscribeOne } from "../../../../common/util/subscribe-one";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import { getConfigEntries } from "../../../../data/config_entries";
import { energySourcesByType } from "../../../../data/energy";
import { subscribeEntityRegistry } from "../../../../data/entity_registry";
import {
  calculateStatisticsSumGrowth,
  calculateStatisticsSumGrowthWithPercentage,
  fetchStatistics,
  Statistics,
} from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDistributionCardConfig } from "../types";

const CIRCLE_CIRCUMFERENCE = 238.76104;

@customElement("hui-energy-distribution-card")
class HuiEnergyDistrubutionCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDistributionCardConfig;

  @state() private _stats?: Statistics;

  @state() private _co2SignalEntity?: string;

  private _fetching = false;

  public setConfig(config: EnergyDistributionCardConfig): void {
    this._config = config;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (!this._fetching && !this._stats) {
      this._fetching = true;
      this._getStatistics().then(() => {
        this._fetching = false;
      });
    }
  }

  protected render() {
    if (!this._config) {
      return html``;
    }

    if (!this._stats) {
      return html`Loading…`;
    }

    const prefs = this._config!.prefs;
    const types = energySourcesByType(prefs);

    // The strategy only includes this card if we have a grid.
    const hasConsumption = true;

    const hasSolarProduction = types.solar !== undefined;
    const hasReturnToGrid = hasConsumption && types.grid![0].flow_to.length > 0;

    const totalGridConsumption =
      calculateStatisticsSumGrowth(
        this._stats,
        types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
      ) ?? 0;

    let totalSolarProduction: number | null = null;

    if (hasSolarProduction) {
      totalSolarProduction =
        calculateStatisticsSumGrowth(
          this._stats,
          types.solar!.map((source) => source.stat_energy_from)
        ) || 0;
    }

    let productionReturnedToGrid: number | null = null;

    if (hasReturnToGrid) {
      productionReturnedToGrid =
        calculateStatisticsSumGrowth(
          this._stats,
          types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
        ) || 0;
    }

    const totalConsumption =
      totalGridConsumption +
      (totalSolarProduction || 0) -
      (productionReturnedToGrid || 0);

    let homeSolarCircumference: number | undefined;
    if (hasSolarProduction) {
      const homePctSolar =
        ((totalSolarProduction || 0) - (productionReturnedToGrid || 0)) /
        totalConsumption;
      homeSolarCircumference = CIRCLE_CIRCUMFERENCE * homePctSolar;
    }

    let lowCarbonConsumption: number | undefined;

    let homeLowCarbonCircumference: number | undefined;
    let homeHighCarbonCircumference: number | undefined;

    let electricityMapUrl: string | undefined;

    if (this._co2SignalEntity && this._co2SignalEntity in this._stats) {
      // Calculate high carbon consumption
      const highCarbonConsumption = calculateStatisticsSumGrowthWithPercentage(
        this._stats[this._co2SignalEntity],
        types
          .grid![0].flow_from.map((flow) => this._stats![flow.stat_energy_from])
          .filter(Boolean)
      );

      const co2State = this.hass.states[this._co2SignalEntity];

      if (co2State) {
        electricityMapUrl = `https://www.electricitymap.org/zone/${co2State.attributes.country_code}`;
      }

      if (highCarbonConsumption !== null) {
        lowCarbonConsumption = totalGridConsumption - highCarbonConsumption;

        const homePctGridHighCarbon = highCarbonConsumption / totalConsumption;

        homeHighCarbonCircumference =
          CIRCLE_CIRCUMFERENCE * homePctGridHighCarbon;

        homeLowCarbonCircumference =
          CIRCLE_CIRCUMFERENCE -
          (homeSolarCircumference || 0) -
          homeHighCarbonCircumference;
      }
    }

    homeSolarCircumference = CIRCLE_CIRCUMFERENCE * 0.1;

    homeHighCarbonCircumference = CIRCLE_CIRCUMFERENCE * 0.8;

    homeLowCarbonCircumference =
      CIRCLE_CIRCUMFERENCE -
      (homeSolarCircumference || 0) -
      homeHighCarbonCircumference;

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${lowCarbonConsumption !== undefined || hasSolarProduction
            ? html`<div class="row">
                ${lowCarbonConsumption === undefined
                  ? html`<div class="spacer"></div>`
                  : html`<div class="circle-container low-carbon">
                      <span class="label">Non-fossil</span>
                      <a
                        class="circle"
                        href=${ifDefined(electricityMapUrl)}
                        target="_blank"
                        rel="noopener no referrer"
                      >
                        <ha-svg-icon .path="${mdiLeaf}"></ha-svg-icon>
                        ${lowCarbonConsumption
                          ? formatNumber(
                              lowCarbonConsumption,
                              this.hass.locale,
                              { maximumFractionDigits: 1 }
                            )
                          : "-"}
                        kWh
                      </a>
                      <svg width="80" height="30">
                        <line x1="40" y1="0" x2="40" y2="30"></line>
                      </svg>
                    </div>`}
                ${hasSolarProduction
                  ? html`<div class="circle-container solar">
                      <span class="label">Solar</span>
                      <div class="circle">
                        <ha-svg-icon .path="${mdiSolarPower}"></ha-svg-icon>
                        ${formatNumber(
                          totalSolarProduction || 0,
                          this.hass.locale,
                          { maximumFractionDigits: 1 }
                        )}
                        kWh
                      </div>
                    </div>`
                  : ""}
                <div class="spacer"></div>
              </div>`
            : ""}
          <div class="row">
            <div class="circle-container grid">
              <div class="circle">
                <ha-svg-icon .path="${mdiTransmissionTower}"></ha-svg-icon>
                <span class="consumption">
                  ${hasReturnToGrid
                    ? html`<ha-svg-icon
                        class="small"
                        .path=${mdiArrowRight}
                      ></ha-svg-icon>`
                    : ""}${formatNumber(
                    totalGridConsumption,
                    this.hass.locale,
                    { maximumFractionDigits: 1 }
                  )}
                  kWh
                </span>
                ${productionReturnedToGrid !== null
                  ? html`<span class="return">
                      <ha-svg-icon
                        class="small"
                        .path=${mdiArrowLeft}
                      ></ha-svg-icon
                      >${formatNumber(
                        productionReturnedToGrid,
                        this.hass.locale,
                        { maximumFractionDigits: 1 }
                      )}
                      kWh
                    </span>`
                  : ""}
              </div>
              <span class="label">Grid</span>
            </div>
            <div class="circle-container home">
              <div
                class="circle ${classMap({
                  border:
                    homeSolarCircumference === undefined &&
                    homeLowCarbonCircumference === undefined,
                })}"
              >
                <ha-svg-icon .path="${mdiHome}"></ha-svg-icon>
                ${formatNumber(totalConsumption, this.hass.locale, {
                  maximumFractionDigits: 1,
                })}
                kWh
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
                              (homeSolarCircumference || 0)
                            }"
                            shape-rendering="geometricPrecision"
                          />`
                        : ""}
                      <circle
                        class="grid"
                        cx="40"
                        cy="40"
                        r="38"
                        stroke-dasharray="${homeHighCarbonCircumference ??
                        CIRCLE_CIRCUMFERENCE -
                          homeSolarCircumference!} ${homeHighCarbonCircumference !==
                        undefined
                          ? CIRCLE_CIRCUMFERENCE - homeHighCarbonCircumference
                          : homeSolarCircumference}"
                        stroke-dashoffset="0"
                        shape-rendering="geometricPrecision"
                      />
                    </svg>`
                  : ""}
              </div>
              <span class="label">Home</span>
            </div>
          </div>
          <div class="lines">
            <svg
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              ${hasReturnToGrid && hasSolarProduction
                ? svg`<path
                    id="return"
                    class="return"
                    d="M47,0 v15 c0,40 -10,35 -30,35 h-20"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                : ""}
              ${hasSolarProduction
                ? svg`<path
                    id="solar"
                    class="solar"
                    d="M${
                      hasReturnToGrid ? 53 : 50
                    },0 v15 c0,40 10,35 30,35 h20"
                    vector-effect="non-scaling-stroke"
                  ></path>`
                : ""}
              <path
                class="grid"
                id="grid"
                d="M0,${hasSolarProduction ? 56 : 53} H100"
                vector-effect="non-scaling-stroke"
              ></path>
              ${productionReturnedToGrid && hasSolarProduction
                ? svg`<circle
                    r="1"
                    class="return"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${
                        6 -
                        (productionReturnedToGrid /
                          (totalGridConsumption +
                            (totalSolarProduction || 0))) *
                          5
                      }s"
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath xlink:href="#return" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${totalSolarProduction
                ? svg`<circle
                    r="1"
                    class="solar"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${
                        6 -
                        ((totalSolarProduction -
                          (productionReturnedToGrid || 0)) /
                          (totalGridConsumption +
                            (totalSolarProduction || 0))) *
                          5
                      }s"
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath xlink:href="#solar" />
                    </animateMotion>
                  </circle>`
                : ""}
              ${totalGridConsumption
                ? svg`<circle
                    r="1"
                    class="grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${
                        6 -
                        (totalGridConsumption /
                          (totalGridConsumption +
                            (totalSolarProduction || 0))) *
                          5
                      }s"
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath xlink:href="#grid" />
                    </animateMotion>
                  </circle>`
                : ""}
            </svg>
          </div>
        </div>
      </ha-card>
    `;
  }

  private async _getStatistics(): Promise<void> {
    const [configEntries, entityRegistryEntries] = await Promise.all([
      getConfigEntries(this.hass),
      subscribeOne(this.hass.connection, subscribeEntityRegistry),
    ]);

    const co2ConfigEntry = configEntries.find(
      (entry) => entry.domain === "co2signal"
    );

    this._co2SignalEntity = undefined;

    if (co2ConfigEntry) {
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

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

    const statistics: string[] = [];

    if (this._co2SignalEntity !== undefined) {
      statistics.push(this._co2SignalEntity);
    }

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
      --mdc-icon-size: 24px;
    }
    .card-content {
      position: relative;
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
      margin-left: 4px;
      height: 130px;
    }
    .spacer {
      width: 84px;
    }
    .circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      box-sizing: border-box;
      border: 2px solid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 12px;
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
      font-size: 12px;
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
    path.return,
    circle.return {
      stroke: var(--energy-grid-return-color);
    }
    circle.return {
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
    path.grid {
      stroke: var(--energy-grid-consumption-color);
    }
    circle.grid {
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
      animation: rotate-in 0.6s ease-in;
      transition: stroke-dashoffset 0.4s, stroke-dasharray 0.4s;
      fill: none;
    }
    @keyframes rotate-in {
      from {
        stroke-dashoffset: 238.76104;
        stroke-dasharray: 238.76104;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-distribution-card": HuiEnergyDistrubutionCard;
  }
}
