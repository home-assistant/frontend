import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { ClockCardConfig } from "./types";
import { TimeFormat } from "../../../data/translation";
import { useAmPm } from "../../../common/datetime/use_am_pm";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";

const INTERVAL = 1000;

@customElement("hui-clock-card")
export class HuiClockCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-clock-card-editor");
    return document.createElement("hui-clock-card-editor");
  }

  public static getStubConfig(): ClockCardConfig {
    return {
      type: "clock",
      clock_size: "medium",
      show_seconds: true,
      time_format: TimeFormat.am_pm,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ClockCardConfig;

  @state() private _time?: Intl.DateTimeFormat;

  @state() private _timeHour?: string;

  @state() private _timeMinute?: string;

  @state() private _timeSecond?: string;

  @state() private _timeAmPm?: string;

  private _tickInterval?: undefined | number;

  public setConfig(config: ClockCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    if (this._config?.clock_size === "small") return 1;
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    if (this._config?.clock_size === "small") {
      return {
        min_rows: 1,
        rows: 1,
        max_rows: 4,
        min_columns: 4,
        columns: 6,
      };
    }

    if (this._config?.clock_size === "large") {
      return {
        min_rows: 2,
        rows: 2,
        max_rows: 4,
        min_columns: 6,
        columns: 6,
      };
    }

    return {
      min_rows: 1,
      rows: 2,
      max_rows: 4,
      min_columns: 4,
      columns: 6,
    };
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
    const locale = this.hass?.locale;

    if (!locale || !this.hass || !this._config) return;

    if (this._config?.time_format) {
      locale.time_format = this._config?.time_format;
    }

    this._time = new Intl.DateTimeFormat(locale.language, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: resolveTimeZone(locale.time_zone, this.hass?.config?.time_zone),
    });

    const parts = this._time.formatToParts();

    this._timeHour = parts.find((part) => part.type === "hour")?.value;
    this._timeMinute = parts.find((part) => part.type === "minute")?.value;
    this._timeSecond = this._config.show_seconds
      ? parts.find((part) => part.type === "second")?.value
      : undefined;
    this._timeAmPm = parts.find((part) => part.type === "dayPeriod")?.value;

    // console.log(
    //   this._timeHour,
    //   this._timeMinute,
    //   this._timeSecond,
    //   this._timeAmPm
    // );
  }

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-card>
        <div
          class="time-wrapper ${this._config.clock_size
            ? `size-${this._config.clock_size}`
            : nothing}"
        >
          <div class="time-parts">
            <div class="time-part hour">${this._timeHour}</div>
            <div class="time-part minute">${this._timeMinute}</div>
            <div class="time-side">
              ${this._timeSecond !== undefined
                ? html`<div class="time-part second">${this._timeSecond}</div>`
                : nothing}
              ${this._config.time_format === TimeFormat.am_pm
                ? html`<div class="time-part am-pm">${this._timeAmPm}</div>`
                : nothing}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
    }

    .time-wrapper {
      display: grid;
      height: 100%;
      place-items: center;
    }

    .time-parts {
      align-items: center;
      display: flex;
      font-size: 1.75rem;
      font-weight: 500;
      line-height: 1;
      padding: 0.5rem 0;
    }

    .time-wrapper.size-medium .time-parts {
      font-size: 3rem;
    }

    .time-wrapper.size-large .time-parts {
      font-size: 4rem;
    }

    .time-wrapper.size-medium .time-parts .time-side {
      font-size: 1.125rem;
    }

    .time-wrapper.size-large .time-parts .time-side {
      font-size: 1.25rem;
    }

    .time-parts .time-part {
      display: flex;
    }

    .time-parts .time-part.seconds {
      opacity: 0.4;
    }

    .time-parts .time-part.am-pm {
      opacity: 0.6;
    }

    .time-parts .time-side {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 1rem;
      font-weight: 500;
      margin-left: 0.35rem;
    }

    .time-parts .time-part.hour:after {
      content: ":";
      margin: 0 2px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card": HuiClockCard;
  }
}
