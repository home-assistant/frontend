import {
  mdiArrowBottomRight,
  mdiArrowRight,
  mdiArrowTopRight,
  mdiChartLine,
  mdiEyeOutline,
  mdiGauge,
  mdiWaterPercent,
  mdiWeatherRainy,
  mdiWeatherSunnyAlert,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { formatTime } from "../../../../common/datetime/format_time";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/weather/ha-level-scale";
import type { HistoryStates } from "../../../../data/history";
import { fetchStatistic } from "../../../../data/recorder";
import type {
  ModernForecastType,
  WeatherEntity,
} from "../../../../data/weather";
import { getWeatherUnit } from "../../../../data/weather";
import {
  getUvLevel,
  getWeatherValue,
  pressureToHpa,
  UV_LEVEL_COLORS,
} from "../../../../data/weather_page";
import type { WeatherMetric, WeatherMetricCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { WeatherForecastController } from "./weather-forecast-controller";
import { WeatherPageCardBase } from "./weather-page-card-base";

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;
const REFRESH_MS = 30 * 60000;
// Days of history used for the average high. The recorder keeps 10 days by
// default, so a week fits for most people.
const AVERAGE_DAYS = 7;
const MIN_AVERAGE_DAYS = 3;
// Change in 3 hours that counts as rising or falling, in hPa
const PRESSURE_TREND_HPA = 1;
const PRESSURE_MIN_HPA = 960;
const PRESSURE_MAX_HPA = 1050;

const ICONS: Record<WeatherMetric, string> = {
  humidity: mdiWaterPercent,
  pressure: mdiGauge,
  visibility: mdiEyeOutline,
  uv_index: mdiWeatherSunnyAlert,
  precipitation: mdiWeatherRainy,
  compared_to_average: mdiChartLine,
};

const FORECASTS: Partial<Record<WeatherMetric, ModernForecastType[]>> = {
  uv_index: ["hourly"],
  precipitation: ["hourly"],
  compared_to_average: ["daily"],
};

interface TemperatureHistory {
  entityId: string;
  // Highest temperature per earlier day
  dailyHighs: number[];
}

interface PressureHistory {
  entityId: string;
  // Pressure about 3 hours ago
  value: number;
}

/**
 * A single weather value, with a short explanation of what it means. The
 * card shows nothing when there is no data for its metric.
 */
@customElement("hui-weather-metric-card")
export class HuiWeatherMetricCard extends WeatherPageCardBase<WeatherMetricCardConfig> {
  @state() private _rainLast24h?: number;

  @state() private _temperatureHistory?: TemperatureHistory;

  @state() private _pressureHistory?: PressureHistory;

  private _forecast?: WeatherForecastController;

  private _lastFetch = 0;

  private _interval?: number;

  public setConfig(config: WeatherMetricCardConfig): void {
    if (!config.metric || !(config.metric in ICONS)) {
      throw new Error("Unknown weather metric");
    }
    super.setConfig(config);
    const types = FORECASTS[config.metric];
    if (types && !this._forecast) {
      this._forecast = new WeatherForecastController(this, types);
    }
  }

  public getGridOptions() {
    return { columns: 3, rows: "auto" as const, min_columns: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._interval = window.setInterval(() => this._fetch(), REFRESH_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.hass || !this._config) {
      return;
    }
    this._forecast?.setSources(this.hass, this._config.entities);
    if (changedProps.has("_config") || !this._lastFetch) {
      this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    if (!this.hass || !this._config) {
      return;
    }
    this._lastFetch = Date.now();
    try {
      switch (this._config.metric) {
        case "precipitation":
          await this._fetchRain();
          break;
        case "pressure":
          await this._fetchPressure();
          break;
        case "compared_to_average":
          await this._fetchTemperatureHistory();
          break;
      }
    } catch (_err) {
      // History is optional; the card shows what it has.
    }
  }

  private async _fetchRain(): Promise<void> {
    const entityId = this._config!.entity;
    if (!entityId) {
      return;
    }
    const statistic = await fetchStatistic(this.hass!, entityId, {
      rolling_window: { duration: { hours: 24 } },
    });
    this._rainLast24h = statistic.change ?? undefined;
  }

  private async _fetchAttributeHistory(
    entityId: string,
    start: Date
  ): Promise<HistoryStates> {
    return this.hass!.callWS<HistoryStates>({
      type: "history/history_during_period",
      start_time: start.toISOString(),
      end_time: new Date().toISOString(),
      entity_ids: [entityId],
      minimal_response: false,
      no_attributes: false,
      significant_changes_only: false,
    });
  }

  private async _fetchPressure(): Promise<void> {
    const pressure = getWeatherValue(
      this.hass!,
      this._config!.entities,
      "pressure"
    );
    if (!pressure) {
      return;
    }
    const entityId = pressure.stateObj.entity_id;
    const start = new Date(Date.now() - 3 * HOUR_MS);
    const history = await this._fetchAttributeHistory(entityId, start);
    // The first state is the one that was active 3 hours ago
    const value = history[entityId]?.find(
      (item) => typeof item.a?.pressure === "number"
    )?.a?.pressure;
    this._pressureHistory =
      typeof value === "number" ? { entityId, value } : undefined;
  }

  private async _fetchTemperatureHistory(): Promise<void> {
    const temperature = getWeatherValue(
      this.hass!,
      this._config!.entities,
      "temperature"
    );
    if (!temperature) {
      return;
    }
    const entityId = temperature.stateObj.entity_id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const start = new Date(todayStart.getTime() - AVERAGE_DAYS * DAY_MS);
    const history = await this._fetchAttributeHistory(entityId, start);

    const highs = new Map<string, number>();
    for (const item of history[entityId] ?? []) {
      const value = item.a?.temperature;
      const time = new Date((item.lc ?? item.lu) * 1000);
      if (typeof value !== "number" || time >= todayStart) {
        continue;
      }
      const day = time.toDateString();
      highs.set(day, Math.max(highs.get(day) ?? -Infinity, value));
    }
    this._temperatureHistory = { entityId, dailyHighs: [...highs.values()] };
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const content = this._renderMetric(this._config.metric);
    if (!content) {
      return nothing;
    }
    return html`
      <ha-card>
        <div class="header">
          <ha-svg-icon .path=${ICONS[this._config.metric]}></ha-svg-icon>
          <span>
            ${this.hass.localize(
              `ui.card.weather.metrics.${this._config.metric}`
            )}
          </span>
        </div>
        ${content}
      </ha-card>
    `;
  }

  private _renderMetric(metric: WeatherMetric): TemplateResult | undefined {
    switch (metric) {
      case "humidity":
        return this._renderHumidity();
      case "pressure":
        return this._renderPressure();
      case "visibility":
        return this._renderVisibility();
      case "uv_index":
        return this._renderUvIndex();
      case "precipitation":
        return this._renderPrecipitation();
      case "compared_to_average":
        return this._renderComparedToAverage();
    }
    return undefined;
  }

  private _value(stateObj: WeatherEntity, attribute: string, value: number) {
    const [number, ...unit] = this.hass!.formatEntityAttributeValueToParts(
      stateObj,
      attribute,
      value
    ).map((part) => part.value);
    return html`
      <div class="value">
        <span class="number">${number}</span>
        <span class="unit">${unit.join("").trim()}</span>
      </div>
    `;
  }

  private _renderHumidity() {
    const sources = this._config!.entities;
    const humidity = getWeatherValue(this.hass!, sources, "humidity");
    if (!humidity) {
      return undefined;
    }
    const dewPoint = getWeatherValue(this.hass!, sources, "dew_point");
    return html`
      <div class="value">
        <span class="number">
          ${formatNumber(Math.round(humidity.value), this.hass!.locale)}%
        </span>
      </div>
      ${
        dewPoint
          ? html`<div class="note">
              ${this.hass!.localize("ui.card.weather.notes.dew_point", {
                dew_point: this._degrees(dewPoint.value),
              })}
            </div>`
          : nothing
      }
    `;
  }

  private _renderVisibility() {
    const visibility = getWeatherValue(
      this.hass!,
      this._config!.entities,
      "visibility"
    );
    if (!visibility) {
      return undefined;
    }
    return this._value(visibility.stateObj, "visibility", visibility.value);
  }

  private _renderPressure() {
    const pressure = getWeatherValue(
      this.hass!,
      this._config!.entities,
      "pressure"
    );
    if (!pressure) {
      return undefined;
    }
    const unit = pressure.stateObj.attributes.pressure_unit;
    const hpa = pressureToHpa(pressure.value, unit);
    const previous =
      this._pressureHistory?.entityId === pressure.stateObj.entity_id
        ? pressureToHpa(this._pressureHistory.value, unit)
        : undefined;

    let trend: "rising" | "falling" | "steady" | undefined;
    if (hpa !== undefined && previous !== undefined) {
      const change = hpa - previous;
      trend =
        change >= PRESSURE_TREND_HPA
          ? "rising"
          : change <= -PRESSURE_TREND_HPA
            ? "falling"
            : "steady";
    }
    const trendIcon = {
      rising: mdiArrowTopRight,
      falling: mdiArrowBottomRight,
      steady: mdiArrowRight,
    };

    return html`
      <div class="value-row">
        ${this._value(pressure.stateObj, "pressure", pressure.value)}
        ${
          trend
            ? html`<ha-svg-icon .path=${trendIcon[trend]}></ha-svg-icon>`
            : nothing
        }
      </div>
      ${
        hpa !== undefined
          ? html`
              <ha-level-scale
                .label=${this.hass!.localize("ui.card.weather.metrics.pressure")}
                .min=${PRESSURE_MIN_HPA}
                .max=${PRESSURE_MAX_HPA}
                .value=${hpa}
              ></ha-level-scale>
              <div class="scale-labels">
                <span>${this.hass!.localize("ui.card.weather.low")}</span>
                <span>${this.hass!.localize("ui.card.weather.high")}</span>
              </div>
            `
          : nothing
      }
      ${
        trend
          ? html`<div class="note">
              ${this.hass!.localize(`ui.card.weather.notes.pressure_${trend}`)}
            </div>`
          : nothing
      }
    `;
  }

  private _renderUvIndex() {
    const uv = getWeatherValue(this.hass!, this._config!.entities, "uv_index");
    if (!uv) {
      return undefined;
    }
    const level = getUvLevel(uv.value);

    // Highest UV index in the coming hours of today, from the hourly forecast
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const peak = (this._forecast?.get("hourly")?.forecast ?? [])
      .filter(
        (entry) =>
          entry.uv_index != null &&
          new Date(entry.datetime) > new Date() &&
          new Date(entry.datetime) <= endOfDay
      )
      .reduce<{ uv: number; time: Date } | undefined>(
        (best, entry) =>
          !best || entry.uv_index! > best.uv
            ? { uv: entry.uv_index!, time: new Date(entry.datetime) }
            : best,
        undefined
      );

    return html`
      <div class="value">
        <span class="number">
          ${formatNumber(Math.round(uv.value), this.hass!.locale)}
        </span>
      </div>
      <div class="level">
        <span
          class="dot"
          style=${styleMap({ "background-color": UV_LEVEL_COLORS[level] })}
        ></span>
        <span>${this.hass!.localize(`ui.card.weather.uv_level.${level}`)}</span>
      </div>
      <ha-level-scale
        .label=${this.hass!.localize("ui.card.weather.metrics.uv_index")}
        .min=${0}
        .max=${11}
        .value=${uv.value}
        .segments=${[
          { to: 3, color: UV_LEVEL_COLORS.low },
          { to: 6, color: UV_LEVEL_COLORS.moderate },
          { to: 8, color: UV_LEVEL_COLORS.high },
          { to: 11, color: UV_LEVEL_COLORS.very_high },
        ]}
      ></ha-level-scale>
      ${
        peak && peak.uv > uv.value
          ? html`<div class="note">
              ${this.hass!.localize("ui.card.weather.notes.uv_peak", {
                uv_index: formatNumber(Math.round(peak.uv), this.hass!.locale),
                time: formatTime(
                  peak.time,
                  this.hass!.locale,
                  this.hass!.config
                ),
              })}
            </div>`
          : nothing
      }
    `;
  }

  private _renderPrecipitation() {
    const entityId = this._config!.entity;
    const stateObj = entityId ? this.hass!.states[entityId] : undefined;
    // Without a rain gauge there is no measured rain, so the card hides.
    if (!stateObj || this._rainLast24h === undefined) {
      return undefined;
    }
    const unit = stateObj.attributes.unit_of_measurement ?? "";

    const hourly = this._forecast?.get("hourly");
    const until = Date.now() + DAY_MS;
    const expectedEntries = (hourly?.forecast ?? []).filter(
      (entry) =>
        entry.precipitation != null &&
        new Date(entry.datetime).getTime() <= until
    );
    const expected = expectedEntries.reduce(
      (total, entry) => total + entry.precipitation!,
      0
    );

    return html`
      <div class="value">
        <span class="number">
          ${formatNumber(this._rainLast24h, this.hass!.locale, {
            maximumFractionDigits: 1,
          })}
        </span>
        <span class="unit">
          ${this.hass!.localize("ui.card.weather.notes.rain_last_24h", {
            unit,
          })}
        </span>
      </div>
      ${
        hourly && expectedEntries.length
          ? html`<div class="note">
              ${this.hass!.localize("ui.card.weather.notes.rain_expected", {
                amount: `${formatNumber(expected, this.hass!.locale, {
                  maximumFractionDigits: 1,
                })} ${getWeatherUnit(
                  this.hass!.config,
                  hourly.stateObj,
                  "precipitation"
                )}`,
              })}
            </div>`
          : nothing
      }
    `;
  }

  private _renderComparedToAverage() {
    const daily = this._forecast?.get("daily");
    const today = daily?.forecast[0];
    const history = this._temperatureHistory;
    if (
      !today ||
      new Date(today.datetime).toDateString() !== new Date().toDateString() ||
      !history ||
      history.dailyHighs.length < MIN_AVERAGE_DAYS
    ) {
      return undefined;
    }
    const average =
      history.dailyHighs.reduce((total, value) => total + value, 0) /
      history.dailyHighs.length;
    const difference = Math.round(today.temperature - average);
    const key = difference > 0 ? "above" : difference < 0 ? "below" : "same";

    return html`
      <div class="value">
        <span class="number">
          ${difference > 0 ? "+" : ""}${this._degrees(difference)}
        </span>
        <span class="unit">
          ${this.hass!.localize(`ui.card.weather.notes.average_${key}`)}
        </span>
      </div>
      <div class="note">
        ${this.hass!.localize("ui.card.weather.notes.average_detail", {
          today: this._degrees(today.temperature),
          average: this._degrees(average),
          days: history.dailyHighs.length,
        })}
      </div>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      .value-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      .value-row ha-svg-icon {
        color: var(--secondary-text-color);
      }
      .scale-labels {
        display: flex;
        justify-content: space-between;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-xs);
      }
      ha-level-scale {
        margin-top: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-metric-card": HuiWeatherMetricCard;
  }
}
