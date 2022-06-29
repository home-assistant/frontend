import {
  mdiEye,
  mdiGauge,
  mdiThermometer,
  mdiWaterPercent,
  mdiWeatherWindy,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateWeekday } from "../../../common/datetime/format_date";
import { formatTimeWeekday } from "../../../common/datetime/format_time";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-svg-icon";
import {
  getWeatherUnit,
  getWind,
  isForecastHourly,
  WeatherEntity,
  weatherIcons,
} from "../../../data/weather";
import { HomeAssistant } from "../../../types";

@customElement("more-info-weather")
class MoreInfoWeather extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: WeatherEntity;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("stateObj")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (
      !oldHass ||
      oldHass.locale !== this.hass.locale ||
      oldHass.config.unit_system !== this.hass.config.unit_system
    ) {
      return true;
    }

    return false;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const hourly = isForecastHourly(this.stateObj.attributes.forecast);

    return html`
      ${this._showValue(this.stateObj.attributes.temperature)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiThermometer}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.temperature")}
              </div>
              <div>
                ${formatNumber(
                  this.stateObj.attributes.temperature!,
                  this.hass.locale
                )}
                ${getWeatherUnit(this.hass, this.stateObj, "temperature")}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.pressure)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiGauge}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.air_pressure")}
              </div>
              <div>
                ${formatNumber(
                  this.stateObj.attributes.pressure!,
                  this.hass.locale
                )}
                ${getWeatherUnit(this.hass, this.stateObj, "pressure")}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.humidity)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiWaterPercent}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.humidity")}
              </div>
              <div>
                ${formatNumber(
                  this.stateObj.attributes.humidity!,
                  this.hass.locale
                )}
                %
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.wind_speed)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiWeatherWindy}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.wind_speed")}
              </div>
              <div>
                ${getWind(
                  this.hass,
                  this.stateObj,
                  this.stateObj.attributes.wind_speed!,
                  this.stateObj.attributes.wind_bearing
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.visibility)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiEye}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.visibility")}
              </div>
              <div>
                ${formatNumber(
                  this.stateObj.attributes.visibility!,
                  this.hass.locale
                )}
                ${getWeatherUnit(this.hass, this.stateObj, "visibility")}
              </div>
            </div>
          `
        : ""}
      ${this.stateObj.attributes.forecast
        ? html`
            <div class="section">
              ${this.hass.localize("ui.card.weather.forecast")}:
            </div>
            ${this.stateObj.attributes.forecast.map((item) =>
              this._showValue(item.templow) || this._showValue(item.temperature)
                ? html`<div class="flex">
                    ${item.condition
                      ? html`
                          <ha-svg-icon
                            .path=${weatherIcons[item.condition]}
                          ></ha-svg-icon>
                        `
                      : ""}
                    ${hourly
                      ? html`
                          <div class="main">
                            ${formatTimeWeekday(
                              new Date(item.datetime),
                              this.hass.locale
                            )}
                          </div>
                        `
                      : html`
                          <div class="main">
                            ${formatDateWeekday(
                              new Date(item.datetime),
                              this.hass.locale
                            )}
                          </div>
                        `}
                    <div class="templow">
                      ${this._showValue(item.templow)
                        ? `${formatNumber(item.templow!, this.hass.locale)}
                          ${getWeatherUnit(
                            this.hass,
                            this.stateObj!,
                            "temperature"
                          )}`
                        : hourly
                        ? ""
                        : "—"}
                    </div>
                    <div class="temp">
                      ${this._showValue(item.temperature)
                        ? `${formatNumber(item.temperature!, this.hass.locale)}
                        ${getWeatherUnit(
                          this.hass,
                          this.stateObj!,
                          "temperature"
                        )}`
                        : "—"}
                    </div>
                  </div>`
                : ""
            )}
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

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        color: var(--paper-item-icon-color);
        margin-left: 8px;
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

  private _showValue(item: number | string | undefined): boolean {
    return typeof item !== "undefined" && item !== null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-weather": MoreInfoWeather;
  }
}
