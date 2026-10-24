import { mdiWeatherSunsetDown, mdiWeatherSunsetUp } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { getSunTimes } from "../../../../common/astronomy/sun_moon";
import { formatTime } from "../../../../common/datetime/format_time";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/weather/ha-sun-arc";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import { weatherCardStyles } from "./weather-card-styles";

const MINUTE_MS = 60000;

/** Sunrise, sunset and daylight for the home location. */
@customElement("hui-weather-sun-card")
export class HuiWeatherSunCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _now = new Date();

  private _interval?: number;

  public setConfig(_config: LovelaceCardConfig): void {
    // Nothing to configure, the card uses the home location.
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): LovelaceGridOptions {
    return { columns: 6, rows: "auto", min_columns: 4 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._interval = window.setInterval(() => {
      this._now = new Date();
    }, MINUTE_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_now") || !changedProps.has("hass")) {
      return true;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    return (
      !oldHass ||
      oldHass.locale !== this.hass!.locale ||
      oldHass.localize !== this.hass!.localize ||
      oldHass.config !== this.hass!.config
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const { latitude, longitude } = this.hass.config;
    const { rise, set } = getSunTimes(this._now, latitude, longitude);
    const daylightMinutes =
      rise && set
        ? Math.round((set.getTime() - rise.getTime()) / MINUTE_MS)
        : 0;

    return html`
      <ha-card>
        <h2 class="title">${this.hass.localize("ui.card.weather.sun")}</h2>
        <ha-sun-arc
          .sunrise=${rise}
          .sunset=${set}
          .now=${this._now}
        ></ha-sun-arc>
        <div class="times">
          <div class="time">
            <ha-svg-icon .path=${mdiWeatherSunsetUp}></ha-svg-icon>
            <span>
              ${rise ? formatTime(rise, this.hass.locale, this.hass.config) : "–"}
            </span>
          </div>
          <div class="time">
            <span>
              ${set ? formatTime(set, this.hass.locale, this.hass.config) : "–"}
            </span>
            <ha-svg-icon .path=${mdiWeatherSunsetDown}></ha-svg-icon>
          </div>
        </div>
        ${
          daylightMinutes
            ? html`<div class="note">
                ${this.hass.localize("ui.card.weather.daylight", {
                  hours: Math.floor(daylightMinutes / 60),
                  minutes: daylightMinutes % 60,
                })}
              </div>`
            : nothing
        }
      </ha-card>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      ha-sun-arc {
        padding: var(--ha-space-2) var(--ha-space-4) 0;
      }
      .times {
        display: flex;
        justify-content: space-between;
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        font-variant-numeric: tabular-nums;
      }
      .time {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      .time ha-svg-icon {
        color: var(--secondary-text-color);
      }
      .note {
        text-align: center;
        margin-top: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-sun-card": HuiWeatherSunCard;
  }
}
