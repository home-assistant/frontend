import "@polymer/iron-icon/iron-icon";
import {
  LitElement,
  property,
  CSSResult,
  css,
  customElement,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import { TemplateResult, html } from "lit-html";

import { HomeAssistant } from "../../../types";

const cardinalDirections = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
  "N",
];

const weatherIcons = {
  "clear-night": "hass:weather-night",
  cloudy: "hass:weather-cloudy",
  exceptional: "hass:alert-circle-outline",
  fog: "hass:weather-fog",
  hail: "hass:weather-hail",
  lightning: "hass:weather-lightning",
  "lightning-rainy": "hass:weather-lightning-rainy",
  partlycloudy: "hass:weather-partly-cloudy",
  pouring: "hass:weather-pouring",
  rainy: "hass:weather-rainy",
  snowy: "hass:weather-snowy",
  "snowy-rainy": "hass:weather-snowy-rainy",
  sunny: "hass:weather-sunny",
  windy: "hass:weather-windy",
  "windy-variant": "hass:weather-windy-variant",
};

@customElement("more-info-weather")
class MoreInfoWeather extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult | void {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="flex">
        <iron-icon icon="hass:thermometer"></iron-icon>
        <div class="main">
          ${this.hass.localize("ui.card.weather.attributes.temperature")}
        </div>
        <div>
          ${this.stateObj.attributes.temperature} ${this.getUnit("temperature")}
        </div>
      </div>
      ${this._showValue(this.stateObj.attributes.pressure)
        ? html`
            <div class="flex">
              <iron-icon icon="hass:gauge"></iron-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.air_pressure")}
              </div>
              <div>
                ${this.stateObj.attributes.pressure}
                ${this.getUnit("air_pressure")}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.humidity)
        ? html`
            <div class="flex">
              <iron-icon icon="hass:water-percent"></iron-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.humidity")}
              </div>
              <div>${this.stateObj.attributes.humidity} %</div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.wind_speed)
        ? html`
            <div class="flex">
              <iron-icon icon="hass:weather-windy"></iron-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.wind_speed")}
              </div>
              <div>
                ${this.getWind(
                  this.stateObj.attributes.wind_speed,
                  this.stateObj.attributes.wind_bearing
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.visibility)
        ? html`
            <div class="flex">
              <iron-icon icon="hass:eye"></iron-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.visibility")}
              </div>
              <div>
                ${this.stateObj.attributes.visibility} ${this.getUnit("length")}
              </div>
            </div>
          `
        : ""}
      ${this.stateObj.attributes.forecast
        ? html`
            <div class="section">
              ${this.hass.localize("ui.card.weather.forecast")}:
            </div>
            ${this.stateObj.attributes.forecast.map((item) => {
              return html`
                <div class="flex">
                  ${this._showValue(item.condition)
                    ? html`
                        <iron-icon
                          .icon="${weatherIcons[item.condition]}"
                        ></iron-icon>
                      `
                    : ""}
                  ${!this._showValue(item.templow)
                    ? html`
                        <div class="main">
                          ${this.computeDateTime(item.datetime)}
                        </div>
                      `
                    : ""}
                  ${this._showValue(item.templow)
                    ? html`
                        <div class="main">
                          ${this.computeDate(item.datetime)}
                        </div>
                        <div class="templow">
                          ${item.templow} ${this.getUnit("temperature")}
                        </div>
                      `
                    : ""};
                  <div class="temp">
                    ${item.temperature} ${this.getUnit("temperature")}
                  </div>
                </div>
              `;
            })}
          `
        : ""}
      ${this.stateObj.attributes.attribution
        ? html`
            <div class="attribution">
              ${this.stateObj.attributes.attribution}
            </div>
          `
        : ""}
    `;
  }

  static get styles(): CSSResult {
    return css`
      iron-icon {
        color: var(--paper-item-icon-color);
      }
      .section {
        margin: 16px 0 8px 0;
        font-size: 1.2em;
      }

      .flex {
        display: flex;
        height: 32px;
        align-items: center;
      }

      .main {
        flex: 1;
        margin-left: 24px;
      }

      .temp,
      .templow {
        min-width: 48px;
        text-align: right;
      }

      .templow {
        margin: 0 16px;
        color: var(--secondary-text-color);
      }

      .attribution {
        color: var(--secondary-text-color);
        text-align: center;
      }
    `;
  }

  private computeDate(data) {
    const date = new Date(data);
    return date.toLocaleDateString(this.hass.language, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  private computeDateTime(data) {
    const date = new Date(data);
    return date.toLocaleDateString(this.hass.language, {
      weekday: "long",
      hour: "numeric",
    });
  }

  private getUnit(measure: string): string {
    const lengthUnit = this.hass.config.unit_system.length || "";
    switch (measure) {
      case "air_pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      default:
        return this.hass.config.unit_system[measure] || "";
    }
  }

  private windBearingToText(degree: string): string {
    const degreenum = parseInt(degree, 10);
    if (isFinite(degreenum)) {
      // tslint:disable-next-line: no-bitwise
      return cardinalDirections[(((degreenum + 11.25) / 22.5) | 0) % 16];
    }
    return degree;
  }

  private getWind(speed: string, bearing: string) {
    if (bearing != null) {
      const cardinalDirection = this.windBearingToText(bearing);
      return `${speed} ${this.getUnit("length")}/h (${this.hass.localize(
        `ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`
      ) || cardinalDirection})`;
    }
    return `${speed} ${this.getUnit("length")}/h`;
  }

  private _showValue(item) {
    return typeof item !== "undefined" && item !== null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-weather": MoreInfoWeather;
  }
}
