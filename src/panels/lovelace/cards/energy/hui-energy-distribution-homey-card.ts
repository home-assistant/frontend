import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, svg, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
  getSummedData,
  computeConsumptionData,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDistributionCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";

@customElement("hui-energy-distribution-homey-card")
class HuiEnergyDistrubutionHomeyCard
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

    const { summedData, compareSummedData: _ } = getSummedData(this._data);
    const { consumption, compareConsumption: __ } = computeConsumptionData(
      summedData,
      undefined
    );

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

    const totalLines =
      gridConsumption +
      (solarConsumption || 0) +
      (solarToGrid || 0) +
      (solarToBattery || 0) +
      (batteryConsumption || 0) +
      (batteryFromGrid || 0) +
      (batteryToGrid || 0);

    // Coerce all energy numbers to the same unit (the biggest)
    // const maxEnergy = Math.max(
    //   lowCarbonEnergy || 0,
    //   totalSolarProduction || 0,
    //   returnedToGrid || 0,
    //   totalFromGrid || 0,
    //   totalHomeConsumption,
    //   totalBatteryIn || 0,
    //   totalBatteryOut || 0
    // );
    // const targetEnergyUnit = formatConsumptionShort(this.hass, maxEnergy, "kWh")
    //   .split(" ")
    //   .pop();

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
      <svg
          id="Layer_1"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox="0 0 612 792"
        >
          <g id="house">
            <path
              class="st3"
              d="M249.7,470.15l47.44,19.76,217.41-36.71v-105.89l-96.56-64.65-120.85,106.16-50.3-21.02-112.33,22.71-84.5-35.01v95.44l69.82,31.62s25.41,14.12,25.98,1.69-.56-83.58-.56-83.58l96.56-17.98-.56,87.44h8.47l-.02.02Z"
            />
          </g>
          <g id="roof">
            <path
              class="st0"
              d="M321.87,367.24l87.08-75.54s6.21-8.47,20.33,0,101.08,66.07,101.08,66.07c0,0,11.29-1.69,5.08-7.34s-114.64-76.8-114.64-76.8l-179.01-64.94-121.98,106.16,177.32,73.98s-.22.05,24.73-21.59h0Z"
            />
          </g>
          <g id="windows">
            <polygon
              class="st10"
              points="429.28 320.12 429.28 374.15 462.59 369.07 462.59 340.92 429.28 320.12"
            />
            <polygon
              class="st10"
              points="465.41 368.31 496.28 363.16 465.41 342.05 465.41 368.31"
            />
            <polyline
              class="st10"
              points="429.28 376.97 462.59 371.61 462.59 409.72 429.28 415.37"
            />
            <polygon
              class="st10"
              points="465.61 370.48 496.28 366.11 496.28 404.74 465.61 408.78 465.61 370.48"
            />
            <polygon
              class="st10"
              points="429.28 418.38 429.28 448.69 462.59 442.95 462.59 413.3 429.28 418.38"
            />
            <polygon
              class="st10"
              points="465.61 413.02 465.61 442.48 495.91 437.49 496.28 407.96 465.61 413.02"
            />
            <polygon
              class="st10"
              points="70.97 387.14 70.97 408.97 90.27 417.16 90.27 394.95 70.97 387.14"
            />
            <polygon
              class="st10"
              points="93 396 93 419.04 111.63 426.26 111.63 403.98 93 396"
            />
          </g>
          ${
            hasSolarProduction
              ? svg`<g id="solar">
                  <g>
                    <polygon
                      class="st7"
                      points="243.66 227.42 220.68 247.02 246.67 256.78 270.07 236.89 243.66 227.42"
                    />
                    <polygon
                      class="st7"
                      points="271.33 237.72 248.35 257.32 274.34 267.09 297.74 247.2 271.33 237.72"
                    />
                    <polygon
                      class="st7"
                      points="299.14 248.02 276.17 267.62 302.15 277.39 325.55 257.49 299.14 248.02"
                    />
                    <polygon
                      class="st7"
                      points="326.81 258.33 303.84 277.92 329.82 287.69 353.22 267.8 326.81 258.33"
                    />
                    <polygon
                      class="st7"
                      points="354.24 268.62 331.26 288.22 357.25 297.99 380.65 278.09 354.24 268.62"
                    />
                  </g>
                  <g>
                    <polygon
                      class="st7"
                      points="219.77 247.87 196.39 267.82 222.37 277.58 245.78 257.69 219.77 247.87"
                    />
                    <polygon
                      class="st7"
                      points="247.44 258.18 224.06 278.12 250.04 287.89 273.45 268 247.44 258.18"
                    />
                    <polygon
                      class="st7"
                      points="275.25 268.47 251.87 288.42 277.85 298.19 301.26 278.29 275.25 268.47"
                    />
                    <polygon
                      class="st7"
                      points="302.92 278.78 279.54 298.72 305.52 308.49 328.93 288.6 302.92 278.78"
                    />
                    <polygon
                      class="st7"
                      points="330.35 289.07 306.97 309.02 332.95 318.79 356.36 298.89 330.35 289.07"
                    />
                  </g>
                  <g>
                    <polygon
                      class="st7"
                      points="195.07 268.62 171.69 288.57 197.68 298.34 221.08 278.44 195.07 268.62"
                    />
                    <polygon
                      class="st7"
                      points="222.75 278.93 199.36 298.87 225.35 308.64 248.75 288.75 222.75 278.93"
                    />
                    <polygon
                      class="st7"
                      points="250.56 289.22 227.18 309.17 253.16 318.94 276.56 299.04 250.56 289.22"
                    />
                    <polygon
                      class="st7"
                      points="278.23 299.53 254.85 319.48 280.83 329.24 304.23 309.35 278.23 299.53"
                    />
                    <polygon
                      class="st7"
                      points="305.66 309.83 282.27 329.77 308.26 339.54 331.66 319.65 305.66 309.83"
                    />
                  </g>
                </g>
                <g id="powerline_solar">
                    <path
                      class="powerline solar"
                      d="M359.02,301.46l10.97,3.27s4.64,1.39,5.44,3.26c.54,1.26,1.01,3.23,1.05,6.3.13,10.18,0,95.72,0,95"
                    />
                    <path
                      class="powerline solar animated"
                      style="--speed: ${
                        6 -
                        ((solarToGrid ?? 0) / totalLines +
                          (solarConsumption ?? 0) / totalLines +
                          (solarToBattery ?? 0) / totalLines) *
                          6
                      };"
                      d="M359.02,301.46l10.97,3.27s4.64,1.39,5.44,3.26c.54,1.26,1.01,3.23,1.05,6.3.13,10.18,0,95.72,0,95"
                    />
                </g>`
              : nothing
          }

          ${
            hasBattery
              ? svg`<g id="battery">
                  <path
                    class="st11"
                    d="M334.22,403.32l13.98-1.32s1.32-.33,1.46,1.32c.23,2.63,0,49.69,0,49.69,0,0-.57,1.51-2.26,1.88s-25.79,3.58-25.79,3.58c0,0-2.64-.38-2.82-3.01s0-48.56,0-48.56c0,0-.16-1.63,1.91-2.2s13.52-1.38,13.52-1.38h0Z"
                  />
                  <polygon
                    class="st1"
                    points="336.29 419.14 330.08 431.37 334.19 431.37 334.19 438.52 340.05 427.8 336.48 428.83 336.29 419.14"
                  />
                </g>
                <g id="powerline_battery">
                  <path
                    class="powerline"
                    d="M349.74 427.8 372.98 424.19 "
                    />
                    ${
                      (batteryToGrid || batteryConsumption) &&
                      (batteryToGrid ?? 0) + (batteryConsumption ?? 0) >
                        (solarToBattery ?? 0) + (batteryFromGrid ?? 0)
                        ? svg`<path
                          style="--speed: ${(((batteryToGrid ?? 0) + (batteryConsumption ?? 0) - ((solarToBattery ?? 0) + (batteryFromGrid ?? 0))) / totalLines) * 5};"
                          class="powerline battery animated"
                          d="M349.74 427.8 372.98 424.19 "
                          />`
                        : nothing
                    }
                    ${
                      (solarToBattery || batteryFromGrid) &&
                      (batteryToGrid ?? 0) + (batteryConsumption ?? 0) <
                        (solarToBattery ?? 0) + (batteryFromGrid ?? 0)
                        ? svg`<path
                          style="--speed: ${(((solarToBattery ?? 0) + (batteryFromGrid ?? 0) - ((batteryToGrid ?? 0) + (batteryConsumption ?? 0))) / totalLines) * 5};"
                          class="powerline battery animated-backwards"
                          d="M349.74 427.8 372.98 424.19 "
                          />`
                        : nothing
                    }
                </g>`
              : nothing
          }


          <g>



          <g id="powerline_house">
            <path
              class="powerline"
              d="M387.66,421.21l16.59-2.35s2.07.09"
              />
              <path
              class="powerline house animated"
              style="--speed: ${(((gridConsumption ?? 0) + (batteryConsumption ?? 0) + (solarConsumption ?? 0)) / totalLines) * 5};"
              d="M387.66,421.21l16.59-2.35s2.07.09"
            />
          </g>

          ${
            hasGrid
              ? svg`<g id="powerline_grid">
                  <path class="powerline" d="M376.95,441.49v29.98s1.22,7.15,6.12,9.22,48.66,21.27,48.66,21.27c0,0,5.32,2.8.66,3.95-3.88.96-382.38,71.53-382.38,71.53" />
                  ${
                    gridConsumption &&
                    (gridConsumption ?? 0) >
                      (batteryToGrid ?? 0) + (solarToGrid ?? 0)
                      ? svg`<path
                        style="--speed: ${(((gridConsumption ?? 0) - ((batteryToGrid ?? 0) + (solarToGrid ?? 0))) / totalLines) * 20};"
                        class="powerline grid animated"
                        d="M376.95,441.49v29.98s1.22,7.15,6.12,9.22,48.66,21.27,48.66,21.27c0,0,5.32,2.8.66,3.95-3.88.96-382.38,71.53-382.38,71.53"
                        />`
                      : nothing
                  }
                  ${
                    (solarToGrid || batteryToGrid) &&
                    (gridConsumption ?? 0) <
                      (solarToGrid ?? 0) + (batteryToGrid ?? 0)
                      ? svg`<path
                        style="--speed: ${(((solarToGrid ?? 0) + (batteryToGrid ?? 0) - (gridConsumption ?? 0)) / totalLines) * 20};"
                        class="powerline grid animated-backwards"
                        d="M376.95,441.49v29.98s1.22,7.15,6.12,9.22,48.66,21.27,48.66,21.27c0,0,5.32,2.8.66,3.95-3.88.96-382.38,71.53-382.38,71.53"
                        />`
                      : nothing
                  }
                </g>`
              : nothing
          }


          <g id="inverter">
            <rect
              class="st4"
              x="369.59"
              y="409.3"
              width="18.07"
              height="32.19"
              rx="5.71"
              ry="5.71"
            />
          </g>
        </svg>
          </div>
        </div>
        ${
          this._config.link_dashboard
            ? html`
                <div class="card-actions">
                  <ha-button appearance="plain" size="small" href="/energy">
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

    @keyframes dash {
      to {
        stroke-dashoffset: 0;
      }
    }

    .animated {
      animation: dash calc(var(--speed) * 1s) linear infinite;
    }
    .animated-backwards {
      animation: dash calc(var(--speed) * 1s) linear infinite;
      animation-direction: reverse;
    }
    .powerline {
      stroke: #5e5f68;
      fill: transparent;
      stroke-width: 3;
      stroke-linecap: round;
    }
    .powerline.solar.animated {
      --speed: 3;
      stroke: gold;
      stroke-dasharray: 30 150;
      stroke-dashoffset: 180;
    }
    .powerline.grid.animated-backwards,
    .powerline.grid.animated {
      --speed: 10;
      stroke: #0fff4f;
      stroke-dasharray: 30 490;
      stroke-dashoffset: 520;
    }
    .powerline.battery.animated-backwards,
    .powerline.battery.animated {
      --speed: 3;
      stroke: #0de8f7;
      stroke-dasharray: 5 20;
      stroke-dashoffset: 25;
    }
    .powerline.house.animated {
      --speed: 1;
      stroke: #0de8f7;
      stroke-dasharray: 5 20;
      stroke-dashoffset: 25;
    }

    ha-card {
      min-width: 210px;
    }
    .card-content {
      position: relative;
      direction: ltr;
    }
    ha-svg-icon {
      padding-bottom: 2px;
    }
    ha-svg-icon.small {
      --mdc-icon-size: 12px;
    }

    .st0 {
      fill: #19202c;
    }
    .st3 {
      fill: #202733;
    }
    .st6 {
      fill: #0c1118;
    }

    .st7 {
      fill: #9e9682;
    }

    .st8 {
      fill: #161b25;
    }

    .st10 {
      fill: #ffedb8;
    }
    .st1 {
      fill: #0de8f7;
    }
    .st11 {
      fill: #0d1824;
    }
    .card-actions a {
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-distribution-homey-card": HuiEnergyDistrubutionHomeyCard;
  }
}
