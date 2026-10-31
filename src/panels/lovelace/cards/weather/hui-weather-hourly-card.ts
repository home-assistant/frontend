import { mdiWeatherSunsetDown, mdiWeatherSunsetUp } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { getSunEvents } from "../../../../common/astronomy/sun_moon";
import { DragScrollController } from "../../../../common/controllers/drag-scroll-controller";
import { formatTime } from "../../../../common/datetime/format_time";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { ForecastAttribute } from "../../../../data/weather";
import {
  getWeatherStateIcon,
  getWeatherUnit,
  weatherSVGStyles,
} from "../../../../data/weather";
import type { ToggleButton } from "../../../../types";
import type { LovelaceGridOptions } from "../../types";
import type { WeatherHourlyCardConfig, WeatherHourlyMode } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { WeatherForecastController } from "./weather-forecast-controller";
import { WeatherPageCardBase } from "./weather-page-card-base";

const HOUR_MS = 3600000;
const DEFAULT_HOURS = 24;

type HourlySlot =
  | { type: "forecast"; time: Date; entry: ForecastAttribute; isNow: boolean }
  | { type: "sunrise" | "sunset"; time: Date };

@customElement("hui-weather-hourly-card")
export class HuiWeatherHourlyCard extends WeatherPageCardBase<WeatherHourlyCardConfig> {
  @state() private _mode: WeatherHourlyMode = "temperature";

  private _forecast = new WeatherForecastController(this, ["hourly"]);

  private _dragScroll = new DragScrollController(this, {
    selector: ".strip",
  });

  public getGridOptions(): LovelaceGridOptions {
    return { columns: "full", rows: "auto" };
  }

  protected willUpdate(changedProps: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProps);
    if (this.hass && this._config) {
      this._forecast.setSources(this.hass, this._config.entities);
    }
  }

  private _entries(): ForecastAttribute[] {
    const forecast = this._forecast.get("hourly")?.forecast ?? [];
    const now = Date.now();
    return forecast
      .filter((entry) => new Date(entry.datetime).getTime() > now - HOUR_MS)
      .slice(0, this._config?.hours ?? DEFAULT_HOURS);
  }

  private _slots(entries: ForecastAttribute[]): HourlySlot[] {
    const slots: HourlySlot[] = entries.map((entry, index) => ({
      type: "forecast",
      time: new Date(entry.datetime),
      entry,
      isNow: index === 0,
    }));
    if (slots.length < 2) {
      return slots;
    }
    const { latitude, longitude } = this.hass!.config;
    const sunEvents = getSunEvents(
      slots[0].time,
      slots[slots.length - 1].time,
      latitude,
      longitude
    ).map((event) => ({ type: event.type, time: event.time }));
    return [...slots, ...sunEvents].sort(
      (a, b) => a.time.getTime() - b.time.getTime()
    );
  }

  private _modes(entries: ForecastAttribute[]): WeatherHourlyMode[] {
    const modes: WeatherHourlyMode[] = ["temperature"];
    if (
      entries.some(
        (entry) =>
          entry.precipitation_probability != null || entry.precipitation != null
      )
    ) {
      modes.push("precipitation");
    }
    if (entries.some((entry) => entry.wind_speed != null)) {
      modes.push("wind");
    }
    return modes;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const entries = this._entries();
    if (!entries.length) {
      return nothing;
    }
    const modes = this._modes(entries);
    const mode = modes.includes(this._mode) ? this._mode : "temperature";
    const buttons: ToggleButton[] = modes.map((value) => ({
      value,
      label: this.hass!.localize(`ui.card.weather.hourly_modes.${value}`),
    }));

    return html`
      <ha-card>
        <div class="top">
          <h2 class="title">
            ${this.hass.localize("ui.card.weather.next_hours")}
          </h2>
          ${
            modes.length > 1
              ? html`<ha-button-toggle-group
                  size="s"
                  variant="neutral"
                  .buttons=${buttons}
                  .active=${mode}
                  @value-changed=${this._modeChanged}
                ></ha-button-toggle-group>`
              : nothing
          }
        </div>
        <div
          class="strip ${this._dragScroll.scrolling ? "dragging" : ""}"
          role="list"
        >
          ${this._slots(entries).map((slot) => this._renderSlot(slot, mode))}
        </div>
      </ha-card>
    `;
  }

  private _renderSlot(slot: HourlySlot, mode: WeatherHourlyMode) {
    const hass = this.hass!;
    const time = formatTime(slot.time, hass.locale, hass.config);
    if (slot.type !== "forecast") {
      return html`
        <div class="slot sun" role="listitem">
          <span class="time">${time}</span>
          <ha-svg-icon
            .path=${
              slot.type === "sunrise"
                ? mdiWeatherSunsetUp
                : mdiWeatherSunsetDown
            }
          ></ha-svg-icon>
          <span class="primary">
            ${hass.localize(`ui.card.weather.${slot.type}`)}
          </span>
          <span class="secondary"></span>
        </div>
      `;
    }

    const { entry } = slot;
    const [primary, secondary] = this._values(entry, mode);
    return html`
      <div class="slot ${slot.isNow ? "now" : ""}" role="listitem">
        <span class="time">
          ${slot.isNow ? hass.localize("ui.card.weather.now") : time}
        </span>
        <div class="icon">
          ${
            entry.condition
              ? getWeatherStateIcon(
                  entry.condition,
                  this,
                  entry.is_daytime === false
                )
              : nothing
          }
        </div>
        <span class="primary">${primary}</span>
        <span class="secondary">${secondary}</span>
      </div>
    `;
  }

  private _values(
    entry: ForecastAttribute,
    mode: WeatherHourlyMode
  ): [string | TemplateResult, string] {
    const hass = this.hass!;
    const stateObj = this._forecast.get("hourly")!.stateObj;
    const probability =
      entry.precipitation_probability != null
        ? `${formatNumber(entry.precipitation_probability, hass.locale)}%`
        : "";
    const amount = entry.precipitation
      ? `${formatNumber(entry.precipitation, hass.locale)} ${getWeatherUnit(
          hass.config,
          stateObj,
          "precipitation"
        )}`
      : "";

    switch (mode) {
      case "precipitation":
        return probability ? [probability, amount] : [amount || "–", ""];
      case "wind":
        return entry.wind_speed != null
          ? [
              formatNumber(Math.round(entry.wind_speed), hass.locale),
              getWeatherUnit(hass.config, stateObj, "wind_speed"),
            ]
          : ["–", ""];
      default:
        return [
          this._degrees(entry.temperature),
          // Only mention rain when it is likely enough to matter
          (entry.precipitation_probability ?? 0) >= 20 ? probability : "",
        ];
    }
  }

  private _modeChanged(ev: CustomEvent<{ value: WeatherHourlyMode }>) {
    this._mode = ev.detail.value;
  }

  static styles = [
    weatherSVGStyles,
    weatherCardStyles,
    css`
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ha-space-2);
        flex-wrap: wrap;
      }
      .strip {
        display: flex;
        gap: var(--ha-space-1);
        overflow-x: auto;
        scrollbar-width: thin;
        margin: 0 calc(-1 * var(--ha-space-2));
        padding: var(--ha-space-1) var(--ha-space-2);
        user-select: none;
      }
      .strip.dragging {
        cursor: grabbing;
      }
      .slot {
        flex: none;
        width: 64px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-2);
        padding: var(--ha-space-3) 0;
        border-radius: var(--ha-border-radius-lg);
      }
      .slot.sun {
        width: 72px;
      }
      .slot.now {
        background-color: var(--ha-color-fill-neutral-quiet-resting);
      }
      .time {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-xs);
        font-variant-numeric: tabular-nums;
      }
      .icon,
      .slot.sun ha-svg-icon {
        width: 28px;
        height: 28px;
        --mdc-icon-size: 28px;
      }
      .icon > * {
        width: 100%;
        height: 100%;
      }
      .primary {
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        font-variant-numeric: tabular-nums;
      }
      .slot.sun .primary {
        font-size: var(--ha-font-size-s);
      }
      .secondary {
        min-height: 1em;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-xs);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-hourly-card": HuiWeatherHourlyCard;
  }
}
