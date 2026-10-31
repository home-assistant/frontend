import { mdiWeatherWindy } from "@mdi/js";
import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/weather/ha-wind-compass";
import { getWeatherValue, getBeaufort } from "../../../../data/weather_page";
import type { WeatherPageCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { WeatherPageCardBase } from "./weather-page-card-base";

const CARDINALS = [
  "n",
  "nne",
  "ne",
  "ene",
  "e",
  "ese",
  "se",
  "sse",
  "s",
  "ssw",
  "sw",
  "wsw",
  "w",
  "wnw",
  "nw",
  "nnw",
];

/** Wind speed, gusts and direction, with a compass. */
@customElement("hui-weather-wind-card")
export class HuiWeatherWindCard extends WeatherPageCardBase<WeatherPageCardConfig> {
  private _cardinal(bearing: number): string {
    // eslint-disable-next-line no-bitwise
    const key = CARDINALS[(((bearing + 11.25) / 22.5) | 0) % 16];
    return this.hass!.localize(`ui.card.weather.cardinal_direction.${key}`);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const sources = this._config.entities;
    const speed = getWeatherValue(this.hass, sources, "wind_speed");
    if (!speed) {
      return nothing;
    }
    const gust = getWeatherValue(this.hass, sources, "wind_gust_speed");
    const bearingValue = getWeatherValue<number | string>(
      this.hass,
      sources,
      "wind_bearing"
    );
    const bearing =
      bearingValue && isFinite(Number(bearingValue.value))
        ? Number(bearingValue.value)
        : undefined;
    const beaufort = getBeaufort(
      speed.value,
      speed.stateObj.attributes.wind_speed_unit
    );
    const localize = this.hass.localize;

    return html`
      <ha-card>
        <div class="header">
          <ha-svg-icon .path=${mdiWeatherWindy}></ha-svg-icon>
          <span>${localize("ui.card.weather.wind")}</span>
        </div>
        <div class="content">
          <div class="rows">
            <div class="row">
              <span class="label">${localize("ui.card.weather.speed")}</span>
              <span class="data">
                ${this.hass.formatEntityAttributeValue(
                  speed.stateObj,
                  "wind_speed",
                  speed.value
                )}
              </span>
            </div>
            ${
              gust
                ? html`<div class="row">
                    <span class="label"
                      >${localize("ui.card.weather.gusts")}</span
                    >
                    <span class="data">
                      ${this.hass.formatEntityAttributeValue(
                        gust.stateObj,
                        "wind_gust_speed",
                        gust.value
                      )}
                    </span>
                  </div>`
                : nothing
            }
            ${
              bearing !== undefined
                ? html`<div class="row">
                    <span class="label"
                      >${localize("ui.card.weather.from")}</span
                    >
                    <span class="data">
                      ${formatNumber(Math.round(bearing), this.hass.locale)}°
                      ${this._cardinal(bearing)}
                    </span>
                  </div>`
                : nothing
            }
          </div>
          <ha-wind-compass
            .bearing=${bearing}
            .value=${beaufort !== undefined ? String(beaufort) : undefined}
            .unit=${
              beaufort !== undefined
                ? localize("ui.card.weather.beaufort")
                : undefined
            }
            .labels=${[
              localize("ui.card.weather.cardinal_direction.n"),
              localize("ui.card.weather.cardinal_direction.e"),
              localize("ui.card.weather.cardinal_direction.s"),
              localize("ui.card.weather.cardinal_direction.w"),
            ]}
          ></ha-wind-compass>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      .content {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
      }
      .rows {
        flex: 1;
        min-width: 0;
      }
      ha-wind-compass {
        flex: none;
        width: 96px;
        height: 96px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-wind-card": HuiWeatherWindCard;
  }
}
