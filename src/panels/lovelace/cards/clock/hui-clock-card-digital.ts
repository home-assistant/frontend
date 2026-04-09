import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ClockCardConfig } from "../types";
import type { HomeAssistant } from "../../../../types";
import { useAmPm } from "../../../../common/datetime/use_am_pm";
import { resolveTimeZone } from "../../../../common/datetime/resolve-time-zone";

const INTERVAL = 1000;

const TIME_SIZES: Record<NonNullable<ClockCardConfig["clock_size"]>, string> = {
  small: "1.5rem",
  medium: "3rem",
  large: "4rem",
};

const OPTIONAL_ELEMENTS_SIZES: Record<
  NonNullable<ClockCardConfig["clock_size"]>,
  { margin: string; fontSize: string }
> = {
  small: { margin: "0.25rem", fontSize: "var(--ha-font-size-xs)" },
  medium: { margin: "0.375rem", fontSize: "var(--ha-font-size-l)" },
  large: { margin: "0.5rem", fontSize: "var(--ha-font-size-2xl)" },
};

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

    this._timeHour = parts.find((part) => part.type === "hour")?.value;
    this._timeMinute = parts.find((part) => part.type === "minute")?.value;
    this._timeSecond = this.config?.show_seconds
      ? parts.find((part) => part.type === "second")?.value
      : undefined;
    this._timeAmPm = parts.find((part) => part.type === "dayPeriod")?.value;
  }

  render() {
    if (!this.config) return nothing;

    const mappedFontSize = TIME_SIZES[this.config.clock_size || "small"];
    const optionalFontSize =
      OPTIONAL_ELEMENTS_SIZES[this.config.clock_size || "small"].fontSize;
    const optionalMargin =
      OPTIONAL_ELEMENTS_SIZES[this.config.clock_size || "small"].margin;

    return html`
      <div
        class="time-parts"
        style="--font-size:${mappedFontSize};--optional-font-size:${optionalFontSize};--optional-margin:${optionalMargin}"
      >
        <div class="time-part hour-and-minute">
          <span>${this._timeHour}</span>
          <span>:</span>
          <span>${this._timeMinute}</span>
        </div>
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
      container-name: digital-time;
      container-type: inline-size;
      width: 100%;
      overflow: hidden;
    }

    .time-parts {
      align-items: center;
      display: grid;
      grid-template-areas:
        "hour-and-minute second"
        "hour-and-minute am-pm";
      font-weight: var(--ha-font-weight-medium);
      // font-size: clamp is used keeping in mind design choice while resizing
      font-size: clamp(1rem, calc(1.5rem + 10cqw), var(--font-size));
      line-height: 0.8;
      direction: ltr;
    }

    .time-parts .time-part.second,
    .time-parts .time-part.am-pm {
      font-size: clamp(
        var(--ha-font-size-xs),
        0.75rem + 1cqw,
        var(--optional-font-size)
      );
      margin-left: var(--optional-margin);
    }

    @container digital-time (inline-size > 9rem) {
      .time-parts {
        font-size: clamp(1rem, calc(1.5rem + 13cqw), var(--font-size));
      }
      .time-parts .time-part.second,
      .time-parts .time-part.am-pm {
        font-size: clamp(
          var(--ha-font-size-xs),
          0.75rem + 3cqw,
          var(--optional-font-size)
        );
      }
    }

    @container digital-time (inline-size > 12rem) {
      .time-parts {
        font-size: clamp(1rem, calc(1.5rem + 17cqw), var(--font-size));
      }
      .time-parts .time-part.second,
      .time-parts .time-part.am-pm {
        font-size: clamp(
          var(--ha-font-size-xs),
          0.75rem + 7cqw,
          var(--optional-font-size)
        );
      }
    }

    .time-parts .time-part.hour-and-minute {
      grid-area: hour-and-minute;
      justify-self: end;
    }

    .hour-and-minute {
      display: flex;
      gap: 0.125rem;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-digital": HuiClockCardDigital;
  }
}
