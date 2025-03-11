import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import hash from "object-hash";
import { DateTime } from "luxon";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { ClockCardConfig } from "./types";

@customElement("hui-clock-card")
export class HuiClockCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-clock-card-editor");
    return document.createElement("hui-clock-card-editor");
  }

  public static getStubConfig(): ClockCardConfig {
    return {
      type: "clock",
      time_format: "hh:mm:ss",
      size: "normal",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: ClockCardConfig;

  @state() private _templateResult?: RenderTemplateResult;

  @state() private _time?: DateTime;

  @state() private _interval = 1000;

  private _tickInterval?: number;

  public setConfig(config: ClockCardConfig): void {
    if (!config.time_format) {
      throw new Error("time_format required");
    }

    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._startTick();
  }

  private _computeCacheKey() {
    return hash(this._config);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTick();
  }

  private _startTick() {
    this._tick();
    this._tickInterval = window.setInterval(() => this._tick(), this._interval);
  }

  private _stopTick() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = undefined;
    }
  }

  private _tick() {
    const locale = this.hass?.locale?.language;
    const timeZone = this.hass?.config.time_zone;

    this._time = DateTime.now();

    if (locale) this._time = this._time.setLocale(locale);
    if (timeZone) this._time = this._time.setZone(timeZone);
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        <div
          class="time-wrapper ${this._config.clock_size
            ? `size-${this._config.clock_size}`
            : ""}"
        >
          <div class="time-parts">
            <div class="time-part hour">
              ${this._time?.hour.toString().padStart(2, "0")}
            </div>
            <div class="time-part minute">
              ${this._time?.minute.toString().padStart(2, "0")}
            </div>
            ${this._config.time_format === "hh:mm:ss"
              ? html`<div class="time-part second">
                  ${this._time?.second.toString().padStart(2, "0")}
                </div>`
              : nothing}
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
      align-items: baseline;
      display: flex;
      font-size: 1.75rem;
      font-weight: 500;
      line-height: 1;
      padding: 0.75rem 0;
    }

    .time-wrapper.size-medium .time-parts {
      font-size: 2rem;
      padding: 1.5rem 0;
    }

    .time-wrapper.size-large .time-parts {
      font-size: 3rem;
      padding: 2rem 0;
    }

    .time-wrapper.size-medium .time-parts .time-part.second {
      font-size: 1.25rem;
    }

    .time-wrapper.size-large .time-parts .time-part.second {
      font-size: 1.5rem;
    }

    .time-parts .time-part {
      display: flex;
    }

    .time-parts .time-part.hour:after {
      content: ":";
      margin: 0 2px;
    }

    .time-parts .time-part.second {
      font-size: 1rem;
      font-weight: 500;
      margin-left: 0.25rem;
      opacity: 0.5;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card": HuiClockCard;
  }
}
