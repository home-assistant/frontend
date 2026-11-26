import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WeatherMoonCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";

const DAY_MS = 86400000;
const UPDATE_INTERVAL_MS = 15 * 60000;

const MOON_PHASES: MoonPhase[] = [
  "new_moon",
  "waxing_crescent",
  "first_quarter",
  "waxing_gibbous",
  "full_moon",
  "waning_gibbous",
  "last_quarter",
  "waning_crescent",
];

// The near side of the moon on the large 122 × 122 moon, seen with north up.
// Dark seas (maria): [x, y, rx, ry, rotation, darkness]
const MARIA: [number, number, number, number, number, number][] = [
  [44.5, 40.1, 16.5, 13.2, -15, 0.7], // Imbrium
  [70.9, 41.2, 8.8, 8.2, 0, 0.75], // Serenitatis
  [77.5, 56.6, 12.1, 9.3, 20, 0.7], // Tranquillitatis
  [97.2, 44.5, 6.6, 5.2, 0, 0.8], // Crisium
  [89.5, 67.6, 6.6, 9.9, 10, 0.55], // Fecunditatis
  [80.8, 75.3, 4.9, 4.9, 0, 0.6], // Nectaris
  [29.2, 59.9, 14.3, 23.1, 10, 0.45], // Procellarum
  [51.1, 76.4, 9.9, 7.1, -10, 0.5], // Nubium
  [34.6, 78.6, 5.2, 5.2, 0, 0.6], // Humorum
  [58.3, 23.7, 22, 3.8, -5, 0.4], // Frigoris
  [61, 53.3, 5, 4, 0, 0.55], // Vaporum
  [44.5, 68.7, 6, 5, 0, 0.45], // Cognitum
];

// Small craters in the highlands: [x, y, r]
const CRATERS: [number, number, number][] = [
  [60, 92, 2.2],
  [72, 98, 1.6],
  [48, 100, 1.5],
  [85, 88, 1.8],
  [38, 92, 1.3],
  [66, 84, 1.2],
  [95, 80, 1.3],
  [25, 40, 1.4],
  [82, 30, 1.3],
  [55, 108, 1.2],
];

// Bright young craters: Tycho, Copernicus, Kepler and Aristarchus
const BRIGHT_CRATERS: [number, number, number][] = [
  [54.4, 95, 1.8],
  [44.5, 56.6, 1.5],
  [33.5, 56.6, 1.1],
  [23.7, 40.1, 1.1],
];

// Bright rays from Tycho: [x, y] where each ray ends
const TYCHO_RAYS: [number, number][] = [
  [30, 62],
  [48, 48],
  [72, 60],
  [96, 82],
  [86, 112],
  [30, 108],
  [16, 86],
];

/**
 * Shadow over the unlit part of a moon disc, drawn on the left. The caller
 * mirrors it when the lit side is on the left.
 */
const moonShadowPath = (
  cx: number,
  cy: number,
  r: number,
  fraction: number
): string => {
  const rx = r * Math.abs(1 - 2 * fraction);
  const sweep = fraction < 0.5 ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
};

/**
 * Moon phase, illumination, moonrise and the next full moon. The phase comes
 * from the moon integration when it is set up. Everything else is calculated
 * in the frontend from the home location.
 *
 * With enough room it shows the moon next to the details. With less room it
 * only shows a small moon and the phase.
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
      MOON_PHASES.includes(stateObj.state as MoonPhase)
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
    // The lit side is on the right while the moon waxes, seen from the
    // northern hemisphere. It flips while it wanes and south of the equator.
    const litOnLeft = illumination.phase > 0.5 !== latitude < 0;
    const rows = this._config.grid_options?.rows;
    const phaseName = this.hass.localize(`ui.card.weather.moon_phase.${phase}`);
    const lit = `${formatNumber(
      Math.round(illumination.fraction * 100),
      this.hass.locale
    )}%`;
    const riseOrSet = rise ?? set;
    const time = riseOrSet
      ? formatTime(riseOrSet, this.hass.locale, this.hass.config)
      : undefined;

    return html`
      <ha-card
        class=${classMap({
          "no-background": this._config.no_background ?? false,
          compact: typeof rows === "number" && rows < 4,
        })}
      >
        <h2 class="title">${this.hass.localize("ui.card.weather.moon")}</h2>
        <div class="content">
          ${this._renderMoon(illumination.fraction, litOnLeft, latitude < 0)}
          <div class="facts">
            <div class="phase">
              ${this.hass.localize("ui.card.weather.phase_illumination", {
                phase: phaseName,
                illumination: lit,
              })}
            </div>
            ${
              time
                ? html`<div class="fact">
                    <span class="label">
                      ${this.hass.localize(
                        rise
                          ? "ui.card.weather.moonrise"
                          : "ui.card.weather.moonset"
                      )}
                    </span>
                    <span class="data">${time}</span>
                  </div>`
                : nothing
            }
            <div class="fact">
              <span class="label">
                ${this.hass.localize("ui.card.weather.next_full_moon")}
              </span>
              <span class="data">
                ${
                  daysToFull < 1
                    ? this.hass.localize("ui.card.weather.today")
                    : this.hass.localize("ui.card.weather.days", {
                        count: daysToFull,
                      })
                }
              </span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderMoon(fraction: number, litOnLeft: boolean, south: boolean) {
    return html`
      <svg class="moon" viewBox="0 0 122 122" aria-hidden="true">
        <defs>
          <radialGradient id="moon-fill" cx="0.42" cy="0.38" r="0.68">
            <stop offset="0" stop-color="#ECECE8" />
            <stop offset="0.7" stop-color="#D2D2CD" />
            <stop offset="1" stop-color="#ACACA7" />
          </radialGradient>
          <clipPath id="moon-clip">
            <circle cx="61" cy="61" r="54.9" />
          </clipPath>
          <filter id="moon-soften" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <filter id="moon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <filter
            id="moon-terminator"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feGaussianBlur stdDeviation="1" />
          </filter>
          <filter id="moon-mottle" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
              numOctaves="4"
              seed="3"
            />
            <feColorMatrix
              values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.8" intercept="-0.4" />
              <feFuncG type="linear" slope="1.8" intercept="-0.4" />
              <feFuncB type="linear" slope="1.8" intercept="-0.4" />
            </feComponentTransfer>
          </filter>
          <filter id="moon-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.2"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="2" intercept="-0.5" />
              <feFuncG type="linear" slope="2" intercept="-0.5" />
              <feFuncB type="linear" slope="2" intercept="-0.5" />
            </feComponentTransfer>
          </filter>
        </defs>
        <g clip-path="url(#moon-clip)">
          <circle cx="61" cy="61" r="54.9" fill="url(#moon-fill)" />
          <!-- Seen from the south, the moon is upside down -->
          <g transform=${south ? "rotate(180 61 61)" : ""}>
            <g class="maria" filter="url(#moon-soften)">
              ${MARIA.map(
                ([x, y, rx, ry, rotation, darkness]) =>
                  svg`<ellipse cx=${x} cy=${y} rx=${rx} ry=${ry} fill-opacity=${darkness} transform="rotate(${rotation} ${x} ${y})" />`
              )}
            </g>
            ${CRATERS.map(
              ([x, y, r]) =>
                svg`<circle class="crater" cx=${x} cy=${y} r=${r} />`
            )}
            <g class="rays" filter="url(#moon-glow)">
              ${TYCHO_RAYS.map(
                ([x, y]) => svg`<line x1="54.4" y1="95" x2=${x} y2=${y} />`
              )}
            </g>
            <g class="bright" filter="url(#moon-glow)">
              ${BRIGHT_CRATERS.map(
                ([x, y, r]) => svg`<circle cx=${x} cy=${y} r=${r * 2} />`
              )}
            </g>
            ${BRIGHT_CRATERS.map(
              ([x, y, r]) =>
                svg`<circle class="bright-center" cx=${x} cy=${y} r=${r} />`
            )}
          </g>
          <rect
            class="mottle"
            width="122"
            height="122"
            filter="url(#moon-mottle)"
          />
          <rect
            class="grain"
            width="122"
            height="122"
            filter="url(#moon-grain)"
          />
          ${
            fraction > 0.995
              ? nothing
              : svg`<path
                  class="night"
                  filter="url(#moon-terminator)"
                  d=${moonShadowPath(61, 61, 57.9, fraction)}
                  transform=${litOnLeft ? "translate(122 0) scale(-1 1)" : ""}
                />`
          }
        </g>
        <circle class="rim" cx="61" cy="61" r="54.9" />
      </svg>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      :host {
        container-type: inline-size;
      }
      .no-background {
        background: none;
        backdrop-filter: none;
        box-shadow: none;
        border: none;
      }
      .content {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
      }
      .moon {
        display: block;
        flex: none;
        width: 112px;
        height: 112px;
      }
      .facts {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
      }
      .phase {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-condensed);
      }
      .fact {
        display: flex;
        flex-direction: column;
      }
      .fact .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
        line-height: var(--ha-line-height-normal);
      }
      .fact .data {
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
        font-variant-numeric: tabular-nums;
      }
      .maria {
        fill: #7d7d78;
      }
      .crater {
        fill: rgb(0 0 0 / 9%);
      }
      .rays {
        stroke: #ffffff;
        stroke-width: 1.2;
        stroke-linecap: round;
        opacity: 0.16;
      }
      .bright {
        fill: #ffffff;
        opacity: 0.25;
      }
      .bright-center {
        fill: #f6f6f2;
        opacity: 0.75;
      }
      .mottle {
        opacity: 0.3;
        mix-blend-mode: multiply;
      }
      .grain {
        opacity: 0.12;
        mix-blend-mode: multiply;
      }
      .night {
        fill: rgb(10 10 14 / 75%);
      }
      .rim {
        fill: none;
        stroke: var(--divider-color);
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
      }
      /* Too small for the details: a small moon with the phase */
      ha-card.compact .title,
      ha-card.compact .fact {
        display: none;
      }
      ha-card.compact .moon {
        width: 40px;
        height: 40px;
      }
      ha-card.compact .phase {
        font-size: var(--ha-font-size-m);
      }
      @container (width < 270px) {
        .title,
        .fact {
          display: none;
        }
        .moon {
          width: 40px;
          height: 40px;
        }
        .phase {
          font-size: var(--ha-font-size-m);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-moon-card": HuiWeatherMoonCard;
  }
}
