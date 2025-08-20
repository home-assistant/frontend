import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { ClockCardConfig } from "../types";
import type { HomeAssistant } from "../../../../types";
import { INTERVAL } from "../hui-clock-card";
import { useAmPm } from "../../../../common/datetime/use_am_pm";
import { resolveTimeZone } from "../../../../common/datetime/resolve-time-zone";

@customElement("hui-clock-card-analog")
export class HuiClockCardAnalog extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: ClockCardConfig;

  @state() private _dateTimeFormat?: Intl.DateTimeFormat;

  @state() private _hourDeg?: number;

  @state() private _minuteDeg?: number;

  @state() private _secondDeg?: number;

  private _tickInterval?: undefined | number;

  private _initDate() {
    if (!this.config || !this.hass) {
      return;
    }

    let locale = this.hass.locale;
    if (this.config.time_format) {
      locale = { ...locale, time_format: this.config.time_format };
    }

    this._dateTimeFormat = new Intl.DateTimeFormat(this.hass.locale.language, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone:
        this.config.time_zone ||
        resolveTimeZone(locale.time_zone, this.hass.config?.time_zone),
    });

    this._tick();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.locale !== this.hass?.locale) {
        this._initDate();
      }
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._startTick();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTick();
  }

  private _startTick() {
    this._tickInterval = window.setInterval(() => this._tick(), INTERVAL);
    this._tick();
  }

  private _stopTick() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = undefined;
    }
  }

  private _tick() {
    if (!this._dateTimeFormat) return;

    const parts = this._dateTimeFormat.formatToParts();
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const minuteStr = parts.find((p) => p.type === "minute")?.value;
    const secondStr = parts.find((p) => p.type === "second")?.value;

    const hour = hourStr ? parseInt(hourStr, 10) : 0;
    const minute = minuteStr ? parseInt(minuteStr, 10) : 0;
    const second = secondStr ? parseInt(secondStr, 10) : 0;

    // Analog face: 12-hour based rotation
    const hourOn12 = hour % 12;
    this._hourDeg = hourOn12 * 30 + minute * 0.5; // 30deg per hour + 0.5deg per minute
    this._minuteDeg = minute * 6 + second * 0.1; // 6deg per minute + 0.1deg per second
    this._secondDeg = this.config?.show_seconds ? second * 6 : undefined; // 6deg per second
  }

  render() {
    if (!this.config) return nothing;

    const sizeClass = this.config.clock_size
      ? `size-${this.config.clock_size}`
      : "";

    return html`
      <div
        class="analog-clock ${sizeClass}"
        role="img"
        aria-label="Analog clock"
      >
        <div
          class=${classMap({
            dial: true,
            "dial-border": this.config.analog_options?.border ?? false,
          })}
        >
          ${this.config.analog_options?.ticks === "quarter"
            ? Array.from({ length: 4 }, (_, i) => i).map(
                (i) =>
                  // 4 ticks
                  html`
                    <div
                      aria-hidden
                      class="tick hour"
                      style=${`--tick-rotation: ${i * 90}deg;`}
                    >
                      <div class="line"></div>
                    </div>
                  `
              )
            : !this.config.analog_options?.ticks || // Default to hour ticks
                this.config.analog_options?.ticks === "hour"
              ? Array.from({ length: 12 }, (_, i) => i).map(
                  (i) =>
                    // 12 ticks
                    html`
                      <div
                        aria-hidden
                        class="tick hour"
                        style=${`--tick-rotation: ${i * 30}deg;`}
                      >
                        <div class="line"></div>
                      </div>
                    `
                )
              : this.config.analog_options?.ticks === "minute"
                ? Array.from({ length: 60 }, (_, i) => i).map(
                    (i) =>
                      // 60 ticks
                      html`
                        <div
                          aria-hidden
                          class="tick ${i % 5 === 0 ? "hour" : "minute"}"
                          style=${`--tick-rotation: ${i * 6}deg;`}
                        >
                          <div class="line"></div>
                        </div>
                      `
                  )
                : nothing}
          <div class="center-dot"></div>
          <div
            class="hand hour"
            style=${`--hand-rotation: ${this._hourDeg ?? 0}deg;`}
          ></div>
          <div
            class="hand minute"
            style=${`--hand-rotation: ${this._minuteDeg ?? 0}deg;`}
          ></div>
          ${this.config.show_seconds
            ? html`<div
                class="hand second"
                style=${`--hand-rotation: ${this._secondDeg ?? 0}deg;`}
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
      border-radius: 50%;
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

    .center-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-text-color);
      transform: translate(-50%, -50%);
      z-index: 3;
    }

    .hand {
      position: absolute;
      left: 50%;
      bottom: 50%;
      transform-origin: 50% 100%;
      transform: translate(-50%, 0) rotate(var(--hand-rotation, 0deg));
      background: var(--primary-text-color);
      border-radius: 2px;
      will-change: transform;
    }

    .hand.hour {
      width: 4px;
      height: calc(var(--clock-size) * 0.25); /* 25% of the clock size */
      background: var(--primary-text-color);
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      z-index: 1;
    }

    .hand.minute {
      width: 3px;
      height: calc(var(--clock-size) * 0.35); /* 35% of the clock size */
      background: var(--primary-text-color);
      box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.2);
      opacity: 0.9;
      z-index: 3;
    }

    .hand.second {
      width: 2px;
      height: calc(var(--clock-size) * 0.42); /* 42% of the clock size */
      background: var(--ha-color-border-danger-normal);
      box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.2);
      opacity: 0.8;
      z-index: 2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-analog": HuiClockCardAnalog;
  }
}
