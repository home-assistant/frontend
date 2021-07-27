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
import { round } from "../../../../common/number/round";
import { subscribeOne } from "../../../../common/util/subscribe-one";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import { getConfigEntries } from "../../../../data/config_entries";
import { energySourcesByType } from "../../../../data/energy";
import { subscribeEntityRegistry } from "../../../../data/entity_registry";
import {
  calculateStatisticsSumGrowth,
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
      totalSolarProduction = calculateStatisticsSumGrowth(
        this._stats,
        types.solar!.map((source) => source.stat_energy_from)
      );
    }

    let productionReturnedToGrid: number | null = null;

    if (hasReturnToGrid) {
      productionReturnedToGrid = calculateStatisticsSumGrowth(
        this._stats,
        types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
      );
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
    if (co2percentage !== undefined) {
      const gridPctHighCarbon = co2percentage / 100;

      lowCarbonConsumption =
        totalGridConsumption - totalGridConsumption * gridPctHighCarbon;

      const homePctGridHighCarbon =
        (gridPctHighCarbon * totalGridConsumption) / totalConsumption;

      homeHighCarbonCircumference =
        CIRCLE_CIRCUMFERENCE * homePctGridHighCarbon;

      homeLowCarbonCircumference =
        CIRCLE_CIRCUMFERENCE -
        (homeSolarCircumference || 0) -
        homeHighCarbonCircumference;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${lowCarbonConsumption !== undefined || hasSolarProduction
            ? html`<div class="row">
                ${lowCarbonConsumption === undefined
                  ? html`<div class="spacer"></div>`
                  : html`
                      <div class="circle-container low-carbon">
                        <span class="label">Non-fossil</span>
                        <div class="circle">
                          <ha-svg-icon .path="${mdiLeaf}"></ha-svg-icon>
                          ${round(lowCarbonConsumption, 1)} kWh
                        </div>
                        <svg width="80" height="30">
                          <line x1="40" y1="0" x2="40" y2="30"></line>
                        </svg>
                      </div>
                    `}
                ${hasSolarProduction
                  ? html`<div class="circle-container solar">
                      <span class="label">Solar</span>
                      <div class="circle">
                        <ha-svg-icon .path="${mdiSolarPower}"></ha-svg-icon>
                        ${round(totalSolarProduction || 0, 1)} kWh
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
                    : ""}${round(totalGridConsumption, 1)}
                  kWh
                </span>
                ${productionReturnedToGrid
                  ? html`<span class="return">
                      <ha-svg-icon
                        class="small"
                        .path=${mdiArrowLeft}
                      ></ha-svg-icon
                      >${round(productionReturnedToGrid, 1)} kWh
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
                ${round(totalConsumption, 1)} kWh
                ${homeSolarCircumference !== undefined ||
                homeLowCarbonCircumference !== undefined
                  ? html`<svg>
                      ${homeSolarCircumference !== undefined
                        ? svg`
              <circle
                  class="solar"
                  cx="40"
                  cy="40"
                  r="38"
                  stroke-dasharray="${homeSolarCircumference} ${
                            CIRCLE_CIRCUMFERENCE - homeSolarCircumference
                          }"
                  shape-rendering="geometricPrecision"
                  stroke-dashoffset="0"
                />`
                        : ""}
                      ${homeHighCarbonCircumference
                        ? svg`
                <circle
                  class="low-carbon"
                  cx="40"
                  cy="40"
                  r="38"
                  stroke-dasharray="${homeLowCarbonCircumference} ${
                            CIRCLE_CIRCUMFERENCE - homeLowCarbonCircumference!
                          }"
                  stroke-dashoffset="${
                    ((homeSolarCircumference || 0) +
                      homeHighCarbonCircumference!) *
                    -1
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
                          homeSolarCircumference!} ${homeHighCarbonCircumference
                          ? CIRCLE_CIRCUMFERENCE - homeHighCarbonCircumference
                          : homeSolarCircumference}"
                        stroke-dashoffset="${(homeSolarCircumference || 0) *
                        -1}"
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
              ${productionReturnedToGrid && hasSolarProduction
                ? svg`<path
                    id="return"
                    class="return"
                    d="M50,0 v18 c0,40 -10,35 -30,35 h-20"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                : ""}
              ${totalSolarProduction
                ? svg`<path
                    id="solar"
                    class="solar"
                    d="M50,0 v18 c0,40 10,35 30,35 h20"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                : ""}
              ${totalGridConsumption
                ? svg`<path
                    class="grid"
                    id="grid"
                    d="M0,53 H100"
                    vector-effect="non-scaling-stroke"
                  ></path> `
                : ""}
              ${productionReturnedToGrid && hasSolarProduction
                ? svg`<circle r="1" class="return" vector-effect="non-scaling-stroke">
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
                ? svg`
                <circle r="1" class="solar" vector-effect="non-scaling-stroke">
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
                ? svg`<circle r="1" class="grid" vector-effect="non-scaling-stroke">
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
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

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
    .circle-container.solar {
      height: 130px;
    }
    .spacer {
      width: 80px;
      height: 30px;
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
      stroke: #0f9d58;
    }
    .low-carbon .circle {
      border-color: #0f9d58;
    }
    .low-carbon ha-svg-icon {
      color: #0f9d58;
    }
    .solar .circle {
      border-color: #ff9800;
    }
    circle.solar,
    path.solar {
      stroke: #ff9800;
    }
    circle.solar {
      stroke-width: 4;
      fill: #ff9800;
    }
    circle.low-carbon {
      stroke: #0f9d58;
      fill: #0f9d58;
    }
    path.return,
    circle.return {
      stroke: #673ab7;
    }
    circle.return {
      stroke-width: 4;
      fill: #673ab7;
    }
    .return {
      color: #673ab7;
    }
    .grid .circle {
      border-color: #126a9a;
    }
    .consumption {
      color: #126a9a;
    }
    circle.grid,
    path.grid {
      stroke: #126a9a;
    }
    circle.grid {
      stroke-width: 4;
      fill: #126a9a;
    }
    .home .circle {
      border: none;
    }
    .home .circle.border {
      border-color: var(--primary-color);
    }
    .circle svg circle {
      animation: rotate-in 0.2s ease-in;
      fill: none;
    }
    @keyframes rotate-in {
      from {
        stroke-dashoffset: 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-distribution-card": HuiEnergyDistrubutionCard;
  }
}
