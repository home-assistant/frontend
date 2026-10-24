import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { formatDateWeekdayShort } from "../../../../common/datetime/format_date";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/weather/ha-weather-range-bar";
import {
  getWeatherStateIcon,
  weatherSVGStyles,
} from "../../../../data/weather";
import { getWeatherValue } from "../../../../data/weather_page";
import type { LovelaceGridOptions } from "../../types";
import type { WeatherDailyCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { WeatherForecastController } from "./weather-forecast-controller";
import { WeatherPageCardBase } from "./weather-page-card-base";

const DEFAULT_DAYS = 10;

const isToday = (date: Date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

@customElement("hui-weather-daily-card")
export class HuiWeatherDailyCard extends WeatherPageCardBase<WeatherDailyCardConfig> {
  private _forecast = new WeatherForecastController(this, ["daily"]);

  public getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  protected willUpdate(changedProps: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProps);
    if (this.hass && this._config) {
      this._forecast.setSources(this.hass, this._config.entities);
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const forecast = (this._forecast.get("daily")?.forecast ?? [])
      .filter((entry) => entry.templow != null)
      .slice(0, this._config.days ?? DEFAULT_DAYS);
    if (!forecast.length) {
      return nothing;
    }

    const min = Math.min(...forecast.map((entry) => entry.templow!));
    const max = Math.max(...forecast.map((entry) => entry.temperature));
    const current = getWeatherValue(
      this.hass,
      this._config.entities,
      "temperature"
    );

    return html`
      <ha-card>
        <h2 class="title">
          ${this.hass.localize("ui.card.weather.daily_forecast", {
            count: forecast.length,
          })}
        </h2>
        <div class="days" role="list">
          ${forecast.map((entry) => {
            const date = new Date(entry.datetime);
            const today = isToday(date);
            return html`
              <div class="day ${today ? "today" : ""}" role="listitem">
                <span class="name">
                  ${
                    today
                      ? this.hass!.localize("ui.card.weather.today")
                      : formatDateWeekdayShort(
                          date,
                          this.hass!.locale,
                          this.hass!.config
                        )
                  }
                </span>
                <span class="probability">
                  ${
                    entry.precipitation_probability
                      ? `${formatNumber(
                          entry.precipitation_probability,
                          this.hass!.locale
                        )}%`
                      : nothing
                  }
                </span>
                <div class="icon">
                  ${
                    entry.condition
                      ? getWeatherStateIcon(entry.condition, this)
                      : nothing
                  }
                </div>
                <span class="low">${this._degrees(entry.templow!)}</span>
                <ha-weather-range-bar
                  .min=${min}
                  .max=${max}
                  .low=${entry.templow!}
                  .high=${entry.temperature}
                  .current=${today ? current?.value : undefined}
                ></ha-weather-range-bar>
                <span class="high">${this._degrees(entry.temperature)}</span>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    weatherSVGStyles,
    weatherCardStyles,
    css`
      .days {
        display: flex;
        flex-direction: column;
      }
      .day {
        display: grid;
        grid-template-columns: 3.5em 2.5em 28px 2.5em 1fr 2.5em;
        align-items: center;
        gap: var(--ha-space-3);
        padding: var(--ha-space-2) 0;
        border-top: 1px solid var(--divider-color);
        font-variant-numeric: tabular-nums;
      }
      .day:first-child {
        border-top: none;
      }
      .day.today .name {
        font-weight: var(--ha-font-weight-bold);
      }
      .probability {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .icon {
        width: 28px;
        height: 28px;
        --mdc-icon-size: 28px;
      }
      .icon > * {
        width: 100%;
        height: 100%;
      }
      .low {
        color: var(--secondary-text-color);
        text-align: end;
      }
      .high {
        text-align: end;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-daily-card": HuiWeatherDailyCard;
  }
}
