import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { CountdownCardConfig } from "./types";

@customElement("hui-countdown-card")
export class HuiCountdownCard extends LitElement implements LovelaceCard {
  public static getStubConfig(): CountdownCardConfig {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return {
      type: "countdown",
      title: "Countdown",
      target_date: tomorrow.toISOString().slice(0, 10),
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CountdownCardConfig;

  @state() private _remaining?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  };

  private _tickInterval?: number;

  public setConfig(config: CountdownCardConfig): void {
    if (!config.target_date && !config.entity) {
      throw new Error(
        "Either target_date or entity must be configured for countdown card"
      );
    }
    this._config = config;
    this._tick();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      min_rows: 2,
      rows: 2,
      min_columns: 3,
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

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("hass") && this._config?.entity) {
      this._tick();
    }
  }

  private _startTick() {
    this._tickInterval = window.setInterval(() => this._tick(), 1000);
    this._tick();
  }

  private _stopTick() {
    if (this._tickInterval !== undefined) {
      clearInterval(this._tickInterval);
      this._tickInterval = undefined;
    }
  }

  private _getTargetDate(): Date | undefined {
    if (this._config?.entity && this.hass) {
      const stateObj = this.hass.states[this._config.entity];
      if (stateObj) {
        const d = new Date(stateObj.state);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (this._config?.target_date) {
      const d = new Date(this._config.target_date);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  }

  private _tick() {
    const target = this._getTargetDate();
    if (!target) {
      this._remaining = undefined;
      return;
    }

    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) {
      this._remaining = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
      };
      return;
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    this._remaining = { days, hours, minutes, seconds, expired: false };
  }

  private _pad(n: number): string {
    return n.toString().padStart(2, "0");
  }

  protected render() {
    if (!this._config) return nothing;

    const { title, no_background, show_seconds = true } = this._config;

    if (!this._remaining) {
      return html`
        <ha-card class=${classMap({ "no-background": no_background ?? false })}>
          <ha-alert alert-type="warning"
            >No valid target date configured</ha-alert
          >
        </ha-card>
      `;
    }

    const { days, hours, minutes, seconds, expired } = this._remaining;

    return html`
      <ha-card class=${classMap({ "no-background": no_background ?? false })}>
        <div class="countdown-wrapper">
          ${title ? html`<div class="countdown-title">${title}</div>` : nothing}
          ${
            expired
              ? html`<div class="expired-label">Reached</div>`
              : html`
                  <div class="countdown-display">
                    ${
                    days > 0
                      ? html`
                          <div class="unit">
                            <span class="value">${days}</span>
                            <span class="label">days</span>
                          </div>
                          <div class="separator">:</div>
                        `
                      : nothing
                  }
                    <div class="unit">
                      <span class="value">${this._pad(hours)}</span>
                      <span class="label">hr</span>
                    </div>
                    <div class="separator">:</div>
                    <div class="unit">
                      <span class="value">${this._pad(minutes)}</span>
                      <span class="label">min</span>
                    </div>
                    ${
                    show_seconds
                      ? html`
                          <div class="separator">:</div>
                          <div class="unit">
                            <span class="value">${this._pad(seconds)}</span>
                            <span class="label">sec</span>
                          </div>
                        `
                      : nothing
                  }
                  </div>
                `
          }
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
    }

    .no-background {
      background: none;
      box-shadow: none;
      border: none;
    }

    .countdown-wrapper {
      display: flex;
      height: calc(100% - 32px);
      align-items: center;
      flex-direction: column;
      justify-content: center;
      padding: var(--ha-space-4);
      gap: var(--ha-space-2);
    }

    .countdown-title {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    .countdown-display {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
      direction: ltr;
    }

    .unit {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .value {
      color: var(--primary-text-color);
      font-size: 2rem;
      font-weight: var(--ha-font-weight-medium);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .label {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-xs);
      line-height: 1.2;
      opacity: 0.6;
    }

    .separator {
      color: var(--primary-text-color);
      font-size: 2rem;
      font-weight: var(--ha-font-weight-medium);
      line-height: 1;
      opacity: 0.4;
      padding-bottom: 14px;
    }

    .expired-label {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-countdown-card": HuiCountdownCard;
  }
}
