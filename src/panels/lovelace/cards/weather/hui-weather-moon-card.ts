import {
  mdiMoonFirstQuarter,
  mdiMoonFull,
  mdiMoonLastQuarter,
  mdiMoonNew,
  mdiMoonWaningCrescent,
  mdiMoonWaningGibbous,
  mdiMoonWaxingCrescent,
  mdiMoonWaxingGibbous,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { MoonPhase } from "../../../../common/astronomy/sun_moon";
import {
  getMoonIllumination,
  getMoonTimes,
  getNextFullMoon,
  moonPhaseName,
} from "../../../../common/astronomy/sun_moon";
import { formatTime } from "../../../../common/datetime/format_time";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WeatherMoonCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";

const DAY_MS = 86400000;
const UPDATE_INTERVAL_MS = 15 * 60000;

const MOON_ICONS: Record<MoonPhase, string> = {
  new_moon: mdiMoonNew,
  waxing_crescent: mdiMoonWaxingCrescent,
  first_quarter: mdiMoonFirstQuarter,
  waxing_gibbous: mdiMoonWaxingGibbous,
  full_moon: mdiMoonFull,
  waning_gibbous: mdiMoonWaningGibbous,
  last_quarter: mdiMoonLastQuarter,
  waning_crescent: mdiMoonWaningCrescent,
};

/**
 * Moon phase, illumination, moonrise and the next full moon. The phase comes
 * from the moon integration when it is set up. Everything else is calculated
 * in the frontend from the home location.
 */
@customElement("hui-weather-moon-card")
export class HuiWeatherMoonCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherMoonCardConfig;

  @state() private _now = new Date();

  private _interval?: number;

  public setConfig(config: WeatherMoonCardConfig): void {
    this._config = config;
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
    }, UPDATE_INTERVAL_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!changedProps.has("hass") || changedProps.size > 1) {
      return true;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const entity = this._config?.entity;
    return (
      !oldHass ||
      oldHass.locale !== this.hass!.locale ||
      oldHass.localize !== this.hass!.localize ||
      (!!entity && oldHass.states[entity] !== this.hass!.states[entity])
    );
  }

  private _phase(fraction: number): MoonPhase {
    const stateObj = this._config?.entity
      ? this.hass!.states[this._config.entity]
      : undefined;
    if (
      stateObj &&
      stateObj.state !== UNAVAILABLE &&
      stateObj.state !== UNKNOWN &&
      stateObj.state in MOON_ICONS
    ) {
      return stateObj.state as MoonPhase;
    }
    return moonPhaseName(fraction);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const { latitude, longitude } = this.hass.config;
    const illumination = getMoonIllumination(this._now);
    const phase = this._phase(illumination.phase);
    const { rise, set } = getMoonTimes(this._now, latitude, longitude);
    const daysToFull = Math.round(
      (getNextFullMoon(this._now).getTime() - this._now.getTime()) / DAY_MS
    );

    return html`
      <ha-card>
        <h2 class="title">${this.hass.localize("ui.card.weather.moon")}</h2>
        <div class="content">
          <ha-svg-icon .path=${MOON_ICONS[phase]}></ha-svg-icon>
          <div class="details">
            <div class="phase">
              ${this.hass.localize(`ui.card.weather.moon_phase.${phase}`)}
            </div>
            <div class="rows">
              <div class="row">
                <span class="label">
                  ${this.hass.localize("ui.card.weather.illumination")}
                </span>
                <span class="data">
                  ${formatNumber(
                    Math.round(illumination.fraction * 100),
                    this.hass.locale
                  )}%
                </span>
              </div>
              ${
                rise || set
                  ? html`<div class="row">
                      <span class="label">
                        ${this.hass.localize(
                          rise
                            ? "ui.card.weather.moonrise"
                            : "ui.card.weather.moonset"
                        )}
                      </span>
                      <span class="data">
                        ${formatTime(
                          (rise ?? set)!,
                          this.hass.locale,
                          this.hass.config
                        )}
                      </span>
                    </div>`
                  : nothing
              }
              <div class="row">
                <span class="label">
                  ${this.hass.localize("ui.card.weather.next_full_moon")}
                </span>
                <span class="data">
                  ${
                    daysToFull < 1
                      ? this.hass.localize("ui.card.weather.today")
                      : this.hass.localize("ui.card.weather.in_days", {
                          count: daysToFull,
                        })
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      .content {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        flex: 1;
      }
      .content > ha-svg-icon {
        --mdc-icon-size: 48px;
        flex: none;
      }
      .details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
        min-width: 0;
      }
      .phase {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-bold);
      }
      .row {
        font-size: var(--ha-font-size-s);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-moon-card": HuiWeatherMoonCard;
  }
}
