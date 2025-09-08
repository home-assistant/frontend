import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ClockCardConfig } from "../types";
import type { HomeAssistant } from "../../../../types";
import { useAmPm } from "../../../../common/datetime/use_am_pm";
import { resolveTimeZone } from "../../../../common/datetime/resolve-time-zone";

const INTERVAL = 1000;

@customElement("hui-clock-card-digital")
export class HuiClockCardDigital extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: ClockCardConfig;

  @state() private _dateTimeFormat?: Intl.DateTimeFormat;

  @state() private _timeHour?: string;

  @state() private _timeMinute?: string;

  @state() private _timeSecond?: string;

  @state() private _timeAmPm?: string;

  private _tickInterval?: undefined | number;

  private _initDate() {
    if (!this.config || !this.hass) {
      return;
    }

    let locale = this.hass?.locale;

    if (this.config?.time_format) {
      locale = { ...locale, time_format: this.config.time_format };
    }

    const h12 = useAmPm(locale);
    this._dateTimeFormat = new Intl.DateTimeFormat(this.hass.locale.language, {
      hour: h12 ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: h12 ? "h12" : "h23",
      timeZone:
        this.config?.time_zone ||
        resolveTimeZone(locale.time_zone, this.hass.config?.time_zone),
    });

    this._tick();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass");
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
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;
    const second = this.config?.show_seconds
      ? parts.find((part) => part.type === "second")?.value
      : undefined;
    const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;

    // Only update when values actually change to avoid unnecessary re-renders
    if (hour !== this._timeHour) this._timeHour = hour;
    if (minute !== this._timeMinute) this._timeMinute = minute;
    if (second !== this._timeSecond) this._timeSecond = second;
    if (dayPeriod !== this._timeAmPm) this._timeAmPm = dayPeriod;
  }

  render() {
    if (!this.config) return nothing;

    const sizeClass = this.config.clock_size
      ? `size-${this.config.clock_size}`
      : "";

    return html`
      <div class="time-parts ${sizeClass}">
        <div class="time-part hour">${this._timeHour}</div>
        <div class="time-part minute">${this._timeMinute}</div>
        ${this._timeSecond !== undefined
          ? html`<div class="time-part second">${this._timeSecond}</div>`
          : nothing}
        ${this._timeAmPm !== undefined
          ? html`<div class="time-part am-pm">${this._timeAmPm}</div>`
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .time-parts {
      align-items: center;
      display: grid;
      grid-template-areas:
        "hour minute second"
        "hour minute am-pm";

      font-size: 1.5rem;
      font-weight: var(--ha-font-weight-medium);
      line-height: 0.8;
      direction: ltr;
    }

    .time-title + .time-parts {
      font-size: 1.5rem;
    }

    .time-parts.size-medium {
      font-size: 3rem;
    }

    .time-parts.size-large {
      font-size: 4rem;
    }

    .time-parts.size-medium .time-part.second,
    .time-parts.size-medium .time-part.am-pm {
      font-size: var(--ha-font-size-l);
      margin-left: 6px;
    }

    .time-parts.size-large .time-part.second,
    .time-parts.size-large .time-part.am-pm {
      font-size: var(--ha-font-size-2xl);
      margin-left: 8px;
    }

    .time-parts .time-part.hour {
      grid-area: hour;
    }

    .time-parts .time-part.minute {
      grid-area: minute;
    }

    .time-parts .time-part.second {
      grid-area: second;
      line-height: 0.9;
      opacity: 0.4;
    }

    .time-parts .time-part.am-pm {
      grid-area: am-pm;
      line-height: 0.9;
      opacity: 0.6;
    }

    .time-parts .time-part.second,
    .time-parts .time-part.am-pm {
      font-size: var(--ha-font-size-xs);
      margin-left: 4px;
    }

    .time-parts .time-part.hour:after {
      content: ":";
      margin: 0 2px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-digital": HuiClockCardDigital;
  }
}
