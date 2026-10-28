import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { sunAltitude } from "../../../../common/astronomy/sun_moon";
import "../../../../components/ha-card";
import {
  getWeatherStateIcon,
  weatherSVGStyles,
} from "../../../../data/weather";
import {
  getPrimaryWeatherEntity,
  getWeatherValue,
} from "../../../../data/weather_page";
import type { LovelaceGridOptions } from "../../types";
import type { WeatherPageCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { WeatherForecastController } from "./weather-forecast-controller";
import { WeatherPageCardBase } from "./weather-page-card-base";

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

@customElement("hui-weather-current-card")
export class HuiWeatherCurrentCard extends WeatherPageCardBase<WeatherPageCardConfig> {
  private _forecast = new WeatherForecastController(this, ["daily"]);

  public getGridOptions(): LovelaceGridOptions {
    return { columns: "full", rows: "auto" };
  }

  protected willUpdate(changedProps: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProps);
    if (this.hass && this._config) {
      this._forecast.setSources(this.hass, this._config.entities);
    }
  }

  private _isNight(): boolean {
    const { latitude, longitude } = this.hass!.config;
    return sunAltitude(new Date(), latitude, longitude) < 0;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const sources = this._config.entities;
    const primary = getPrimaryWeatherEntity(this.hass, sources);
    if (!primary) {
      return nothing;
    }
    const temperature = getWeatherValue(this.hass, sources, "temperature");
    const apparent = getWeatherValue(
      this.hass,
      sources,
      "apparent_temperature"
    );

    const today = this._forecast.get("daily")?.forecast[0];
    const hasToday = today && isSameDay(new Date(today.datetime), new Date());

    return html`
      <ha-card>
        <div class="main">
          <div class="info">
            <div class="now">
              ${
                temperature
                  ? html`<span class="temperature"
                      >${this._degrees(temperature.value)}</span
                    >`
                  : nothing
              }
              <div class="condition">
                <span class="state"
                  >${this.hass.formatEntityState(primary)}</span
                >
                ${
                  apparent
                    ? html`<span class="secondary">
                        ${this.hass.localize("ui.card.weather.feels_like", {
                          temperature: this._degrees(apparent.value),
                        })}
                      </span>`
                    : nothing
                }
              </div>
            </div>
            ${
              hasToday && today.templow != null
                ? html`<div class="secondary">
                    ${this.hass.localize("ui.card.weather.high_low", {
                      high: this._degrees(today.temperature),
                      low: this._degrees(today.templow),
                    })}
                  </div>`
                : nothing
            }
          </div>
          <div class="icon">
            ${getWeatherStateIcon(primary.state, this, this._isNight())}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    weatherSVGStyles,
    weatherCardStyles,
    css`
      ha-card {
        padding: var(--ha-space-6);
      }
      .main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ha-space-4);
      }
      .info {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
        min-width: 0;
      }
      .now {
        display: flex;
        align-items: flex-end;
        gap: var(--ha-space-4);
        flex-wrap: wrap;
      }
      .temperature {
        font-size: 72px;
        font-weight: var(--ha-font-weight-light);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .condition {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
        padding-bottom: var(--ha-space-2);
      }
      .state {
        font-size: var(--ha-font-size-xl);
        font-weight: var(--ha-font-weight-medium);
      }
      .secondary {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .icon {
        flex: none;
        width: 96px;
        height: 96px;
        --mdc-icon-size: 96px;
      }
      .icon > * {
        width: 100%;
        height: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-current-card": HuiWeatherCurrentCard;
  }
}
