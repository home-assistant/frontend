import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/ha-card";
import { shallowEqual } from "../../../common/util/shallow-equal";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { DateCardConfig } from "./types";
import {
  computeDateText,
  computeMsUntilMidnight,
  computeResolvedTimeZone,
} from "./hui-date-card-helpers";

@customElement("hui-date-card")
export class HuiDateCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-date-card-editor");
    return document.createElement("hui-date-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): DateCardConfig {
    return {
      type: "date",
      title: hass.localize("ui.panel.lovelace.cards.date.default_title"),
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DateCardConfig;

  @state() private _dateText?: string;

  private _midnightTimer?: number;

  public setConfig(config: DateCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    if (this._config?.date_size === "small") return 1;
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    switch (this._config?.date_size) {
      case "medium":
        return {
          min_rows: this._config?.title ? 2 : 1,
          rows: 2,
          max_rows: 4,
          min_columns: 5,
          columns: 6,
        };
      case "large":
        return {
          min_rows: 2,
          rows: 2,
          max_rows: 4,
          min_columns: 6,
          columns: 6,
        };
      default:
        return {
          min_rows: 1,
          rows: 1,
          max_rows: 4,
          min_columns: 4,
          columns: 6,
        };
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._scheduleMidnightRefresh();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMidnightTimer();
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("hass") && !changedProps.has("_config")) {
      return;
    }

    const localeChanged =
      changedProps.has("hass") &&
      (changedProps.get("hass") as HomeAssistant | undefined)?.locale !==
        this.hass?.locale;

    const oldConfig = changedProps.get("_config") as DateCardConfig | undefined;
    const relevantConfigChanged =
      changedProps.has("_config") &&
      (oldConfig?.time_zone !== this._config?.time_zone ||
        !shallowEqual(oldConfig?.date_format, this._config?.date_format));

    if (localeChanged || relevantConfigChanged) {
      this._scheduleMidnightRefresh();
    }
  }

  private _clearMidnightTimer() {
    if (this._midnightTimer) {
      clearTimeout(this._midnightTimer);
      this._midnightTimer = undefined;
    }
  }

  private _scheduleMidnightRefresh() {
    this._clearMidnightTimer();

    if (!this.hass || !this._config) {
      return;
    }

    this._dateText = computeDateText(
      new Date(),
      this.hass.locale,
      this.hass.config,
      this._config
    );

    const timeZone = computeResolvedTimeZone(
      this.hass.locale,
      this.hass.config,
      this._config
    );
    const delay = computeMsUntilMidnight(new Date(), timeZone);

    this._midnightTimer = window.setTimeout(() => {
      this._scheduleMidnightRefresh();
    }, delay);
  }

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-card
        class=${classMap({
          "no-background": this._config.no_background ?? false,
        })}
      >
        <div
          class="date-wrapper ${
            this._config.date_size ? `size-${this._config.date_size}` : ""
          }"
        >
          ${
            this._config.title !== undefined
              ? html`<div class="date-title">${this._config.title}</div>`
              : nothing
          }
          <div class="date-text">${this._dateText}</div>
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

    .date-wrapper {
      display: flex;
      height: calc(100% - 12px);
      align-items: center;
      flex-direction: column;
      justify-content: center;
      padding: 6px 8px;
      row-gap: 6px;
      text-align: center;
    }

    .date-wrapper.size-medium,
    .date-wrapper.size-large {
      height: calc(100% - 32px);
      padding: 16px;
      row-gap: var(--ha-space-3);
    }

    .date-title {
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

    .date-wrapper.size-medium .date-title {
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-condensed);
    }

    .date-wrapper.size-large .date-title {
      font-size: var(--ha-font-size-2xl);
      line-height: var(--ha-line-height-condensed);
    }

    .date-text {
      direction: ltr;
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .date-wrapper.size-medium .date-text {
      font-size: var(--ha-font-size-3xl);
    }

    .date-wrapper.size-large .date-text {
      font-size: var(--ha-font-size-5xl);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-date-card": HuiDateCard;
  }
}
