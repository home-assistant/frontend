import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { resolveTimeZone } from "../../../../common/datetime/resolve-time-zone";
import type { HomeAssistant } from "../../../../types";
import type { ClockCardConfig } from "../types";
import {
  formatClockCardDate,
  getClockCardDateConfig,
  hasClockCardDate,
} from "./clock-date-format";

function romanize12HourClock(num: number) {
  const numerals = [
    "", // 0 (not used)
    "I", // 1
    "II", // 2
    "III", // 3
    "IV", // 4
    "V", // 5
    "VI", // 6
    "VII", // 7
    "VIII", // 8
    "IX", // 9
    "X", // 10
    "XI", // 11
    "XII", // 12
  ];
  if (num < 1 || num > 12) return "";
  return numerals[num];
}

const DATE_UPDATE_INTERVAL = 60_000;
const QUARTER_TICKS = Array.from({ length: 4 }, (_, i) => i);
const HOUR_TICKS = Array.from({ length: 12 }, (_, i) => i);
const MINUTE_TICKS = Array.from({ length: 60 }, (_, i) => i);

@customElement("hui-clock-card-analog")
export class HuiClockCardAnalog extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: ClockCardConfig;

  @state() private _dateTimeFormat?: Intl.DateTimeFormat;

  @state() private _hourOffsetSec?: number;

  @state() private _minuteOffsetSec?: number;

  @state() private _secondOffsetSec?: number;

  @state() private _date?: string;

  private _dateInterval?: number;

  private _timeZone?: string;

  private _language?: string;

  public connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
    this._initDate();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );
    this._stopDateTick();
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("config") || changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (
        changedProps.has("config") ||
        !oldHass ||
        oldHass.locale !== this.hass?.locale
      ) {
        this._initDate();
      }
    }
  }

  private _handleVisibilityChange = () => {
    if (!document.hidden) {
      this._computeOffsets();
      this._updateDate();
    }
  };

  private _initDate() {
    if (!this.config || !this.hass) {
      this._stopDateTick();
      this._date = undefined;
      return;
    }

    let locale = this.hass.locale;
    if (this.config.time_format) {
      locale = { ...locale, time_format: this.config.time_format };
    }

    const timeZone =
      this.config.time_zone ||
      resolveTimeZone(locale.time_zone, this.hass.config?.time_zone);

    this._language = this.hass.locale.language;
    this._timeZone = timeZone;

    this._dateTimeFormat = new Intl.DateTimeFormat(this.hass.locale.language, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h12",
      timeZone,
    });

    this._computeOffsets();
    this._updateDate();

    if (this.isConnected && hasClockCardDate(this.config)) {
      this._startDateTick();
    } else {
      this._stopDateTick();
    }
  }

  private _startDateTick() {
    this._stopDateTick();
    this._dateInterval = window.setInterval(
      () => this._updateDate(),
      DATE_UPDATE_INTERVAL
    );
  }

  private _stopDateTick() {
    if (this._dateInterval) {
      clearInterval(this._dateInterval);
      this._dateInterval = undefined;
    }
  }

  private _computeOffsets() {
    if (!this._dateTimeFormat) return;

    const date = new Date();

    const parts = this._dateTimeFormat.formatToParts(date);
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const minuteStr = parts.find((p) => p.type === "minute")?.value;
    const secondStr = parts.find((p) => p.type === "second")?.value;

    const hour = hourStr ? parseInt(hourStr, 10) : 0;
    const minute = minuteStr ? parseInt(minuteStr, 10) : 0;
    const second = secondStr ? parseInt(secondStr, 10) : 0;
    const ms = date.getMilliseconds();
    const secondsWithMs = second + ms / 1000;

    const hour12 = hour % 12;

    this._secondOffsetSec = secondsWithMs;
    this._minuteOffsetSec = minute * 60 + secondsWithMs;
    this._hourOffsetSec = hour12 * 3600 + minute * 60 + secondsWithMs;
  }

  private _updateDate() {
    if (!this.config || !hasClockCardDate(this.config) || !this._language) {
      this._date = undefined;
      return;
    }

    const dateConfig = getClockCardDateConfig(this.config);
    this._date = formatClockCardDate(
      new Date(),
      dateConfig,
      this._language,
      this._timeZone
    );
  }

  private _computeClock = memoizeOne((config: ClockCardConfig) => {
    const faceParts = config.face_style?.split("_");
    const dateConfig = getClockCardDateConfig(config);
    const showDate = hasClockCardDate(config);
    const isLongDate =
      dateConfig.parts.includes("month-long") ||
      dateConfig.parts.includes("weekday-long");

    return {
      sizeClass: config.clock_size ? `size-${config.clock_size}` : "",
      isNumbers: faceParts?.includes("numbers") ?? false,
      isRoman: faceParts?.includes("roman") ?? false,
      isUpright: faceParts?.includes("upright") ?? false,
      showDate,
      isLongDate,
    };
  });

  render() {
    if (!this.config) return nothing;

    const { sizeClass, isNumbers, isRoman, isUpright, isLongDate, showDate } =
      this._computeClock(this.config);

    const indicator = (number?: number) => html`
      <div
        class=${classMap({
          line: true,
          numbers: isNumbers,
          roman: isRoman,
        })}
      >
        ${number && this.config?.face_style !== "markers"
          ? html`<div
              class=${classMap({
                number: true,
                [this.config?.clock_size ?? ""]: true,
                upright: isUpright,
              })}
            >
              ${isRoman
                ? romanize12HourClock(number)
                : isNumbers
                  ? number
                  : nothing}
            </div>`
          : nothing}
      </div>
    `;

    return html`
      <div
        class="analog-clock ${sizeClass}"
        role="img"
        aria-label="Analog clock"
      >
        <div
          class=${classMap({
            dial: true,
            "dial-border": this.config.border ?? false,
          })}
        >
          ${this.config.ticks === "quarter"
            ? QUARTER_TICKS.map(
                (i) =>
                  // 4 ticks (12, 3, 6, 9) at 0°, 90°, 180°, 270°
                  html`
                    <div
                      aria-hidden="true"
                      class="tick hour"
                      style=${styleMap({ "--tick-rotation": `${i * 90}deg` })}
                    >
                      ${indicator([12, 3, 6, 9][i])}
                    </div>
                  `
              )
            : !this.config.ticks || // Default to hour ticks
                this.config.ticks === "hour"
              ? HOUR_TICKS.map(
                  (i) =>
                    // 12 ticks (1-12)
                    html`
                      <div
                        aria-hidden="true"
                        class="tick hour"
                        style=${styleMap({ "--tick-rotation": `${i * 30}deg` })}
                      >
                        ${indicator(((i + 11) % 12) + 1)}
                      </div>
                    `
                )
              : this.config.ticks === "minute"
                ? MINUTE_TICKS.map(
                    (i) =>
                      // 60 ticks (1-60)
                      html`
                        <div
                          aria-hidden="true"
                          class="tick ${i % 5 === 0 ? "hour" : "minute"}"
                          style=${styleMap({
                            "--tick-rotation": `${i * 6}deg`,
                          })}
                        >
                          ${i % 5 === 0
                            ? indicator(((i / 5 + 11) % 12) + 1)
                            : indicator()}
                        </div>
                      `
                  )
                : nothing}
          ${showDate
            ? html`<div
                class=${classMap({
                  date: true,
                  [sizeClass]: true,
                  "long-date": isLongDate,
                })}
              >
                ${this._date
                  ?.split("\n")
                  .map((line, index) =>
                    index > 0 ? html`<br />${line}` : line
                  )}
              </div>`
            : nothing}

          <div class="center-dot"></div>
          <div
            class="hand hour"
            style=${styleMap({
              "animation-delay": `-${this._hourOffsetSec ?? 0}s`,
            })}
          ></div>
          <div
            class="hand minute"
            style=${styleMap({
              "animation-delay": `-${this._minuteOffsetSec ?? 0}s`,
            })}
          ></div>
          ${this.config.show_seconds
            ? html`<div
                class=${classMap({
                  hand: true,
                  second: true,
                  step: this.config.seconds_motion === "tick",
                })}
                style=${styleMap({
                  "animation-delay": `-${
                    (this.config.seconds_motion === "tick"
                      ? Math.floor(this._secondOffsetSec ?? 0)
                      : (this._secondOffsetSec ?? 0)) as number
                  }s`,
                })}
              ></div>`
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .analog-clock {
      --clock-size: 100px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--clock-size);
      height: var(--clock-size);
      background: var(--ha-clock-card-analog-face-background, none);
      border-radius: var(--ha-clock-card-analog-face-border-radius, none);
      padding: var(--ha-clock-card-analog-face-padding, none);
    }

    .analog-clock.size-medium {
      --clock-size: 160px;
    }

    .analog-clock.size-large {
      --clock-size: 220px;
    }

    .dial {
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    .dial-border {
      border: 2px solid var(--divider-color);
      border-radius: var(--ha-border-radius-circle);
    }

    .tick {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: rotate(var(--tick-rotation));
      pointer-events: none;
      z-index: 0;
    }

    .tick .line {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: calc(var(--clock-size) * 0.04);
      background: var(--primary-text-color);
      opacity: 0.5;
      border-radius: 1px;
    }

    .tick.hour .line {
      width: 2px;
      height: calc(var(--clock-size) * 0.07);
      opacity: 0.8;
    }

    .tick.hour .line.numbers,
    .tick.hour .line.roman {
      height: calc(var(--clock-size) * 0.03);
    }

    .tick.minute .line.numbers,
    .tick.minute .line.roman {
      height: calc(var(--clock-size) * 0.015);
    }

    .tick .number {
      position: absolute;
      top: 0%;
      left: 50%;
      transform: translate(-50%, 35%);
      color: var(--primary-text-color);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }

    .tick .number.upright {
      transform: translate(-50%, 35%) rotate(calc(var(--tick-rotation) * -1));
    }

    .tick .number.small {
      font-size: var(--ha-font-size-s);
    }

    .tick .number.medium {
      font-size: var(--ha-font-size-m);
    }

    .tick .number.large {
      font-size: var(--ha-font-size-l);
    }

    .center-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      border-radius: var(--ha-border-radius-circle);
      background: var(--primary-text-color);
      transform: translate(-50%, -50%);
      z-index: 3;
    }

    .hand {
      position: absolute;
      left: 50%;
      bottom: 50%;
      transform-origin: 50% 100%;
      transform: translate(-50%, 0) rotate(0deg);
      background: var(--primary-text-color);
      border-radius: 2px;
      will-change: transform;
      animation-name: ha-clock-rotate;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }

    .hand.hour {
      width: 4px;
      height: calc(var(--clock-size) * 0.25); /* 25% of the clock size */
      background: var(--primary-text-color);
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      z-index: 1;
      animation-duration: 43200s; /* 12 hours */
    }

    .hand.minute {
      width: 3px;
      height: calc(var(--clock-size) * 0.35); /* 35% of the clock size */
      background: var(--primary-text-color);
      box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.2);
      opacity: 0.9;
      z-index: 3;
      animation-duration: 3600s; /* 60 minutes */
    }

    .hand.second {
      width: 2px;
      height: calc(var(--clock-size) * 0.42); /* 42% of the clock size */
      background: var(--ha-color-border-danger-normal);
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.2);
      opacity: 0.8;
      z-index: 2;
      animation-duration: 60s; /* 60 seconds */
    }

    .hand.second.step {
      animation-timing-function: steps(60, end);
    }

    @keyframes ha-clock-rotate {
      from {
        transform: translate(-50%, 0) rotate(0deg);
      }
      to {
        transform: translate(-50%, 0) rotate(360deg);
      }
    }

    .date {
      position: absolute;
      top: 68%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: block;
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
      text-align: center;
      opacity: 0.8;
      max-width: 87%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .date.long-date:not(.size-medium):not(.size-large) {
      font-size: var(--ha-font-size-xs);
    }

    .date.size-medium {
      font-size: var(--ha-font-size-l);
    }

    .date.size-large {
      font-size: var(--ha-font-size-xl);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-analog": HuiClockCardAnalog;
  }
}
