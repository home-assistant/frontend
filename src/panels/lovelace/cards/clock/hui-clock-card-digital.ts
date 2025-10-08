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

  @state() private _dateFormat?: Intl.DateTimeFormat;

  @state() private _timeHour?: string;

  @state() private _timeMinute?: string;

  @state() private _timeSecond?: string;

  @state() private _timeAmPm?: string;

  @state() private _date?: string;

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

    if (this.config?.date_format === "day") {
      this._dateFormat = new Intl.DateTimeFormat(this.hass.locale.language, {
        day: "2-digit",
        timeZone:
          this.config?.time_zone ||
          resolveTimeZone(locale.time_zone, this.hass.config?.time_zone),
      });
    } else {
      this._dateFormat = undefined;
    }

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

    this._timeHour = parts.find((part) => part.type === "hour")?.value;
    this._timeMinute = parts.find((part) => part.type === "minute")?.value;
    this._timeSecond = this.config?.show_seconds
      ? parts.find((part) => part.type === "second")?.value
      : undefined;
    this._timeAmPm = parts.find((part) => part.type === "dayPeriod")?.value;

    if (this._dateFormat) {
      const dateParts = this._dateFormat.formatToParts();
      this._date = dateParts.find((part) => part.type === "day")?.value;
    } else {
      this._date = undefined;
    }
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
      ${this._date !== undefined
        ? html`<div class="date ${sizeClass}">${this._date}</div>`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .date {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      opacity: 0.6;
      text-align: center;
      direction: ltr;
      margin-top: 4px;
      align-self: center;
    }

    .date.size-medium {
      font-size: var(--ha-font-size-l);
      margin-top: 6px;
    }

    .date.size-large {
      font-size: var(--ha-font-size-xl);
      margin-top: 8px;
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
