import type { PropertyValues } from "lit";
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
import { useAmPm } from "../../../common/datetime/use_am_pm";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import { CacheManager } from "../../../util/cache-manager";
import { fireEvent } from "../../../common/dom/fire_event";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

const INTERVAL = 1000;

const templateCache = new CacheManager<RenderTemplateResult>(1000);

@customElement("hui-clock-card")
export class HuiClockCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-clock-card-editor");
    return document.createElement("hui-clock-card-editor");
  }

  public static getStubConfig(): ClockCardConfig {
    return {
      type: "clock",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ClockCardConfig;

  @state() private _dateTimeFormat?: Intl.DateTimeFormat;

  @state() private _error?: string;

  @state() private _errorLevel?: "ERROR" | "WARNING";
  
  @state() private _resolvedTimeZone?: string;

  @state() private _templateResult?: RenderTemplateResult;

  @state() private _timeHour?: string;

  @state() private _timeMinute?: string;

  @state() private _timeSecond?: string;

  @state() private _timeAmPm?: string;

  private _tickInterval?: undefined | number;

  private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  private _unsubTimeZoneTemplate?: Promise<UnsubscribeFunc>;

  public setConfig(config: ClockCardConfig): void {
    this._config = config;
    this._resolvedTimeZone = undefined;
    this._initDate();
  }

  private _initDate() {
    if (!this._config || !this.hass) {
      return;
    }

    let locale = this.hass?.locale;

    if (this._config?.time_format) {
      locale = { ...locale, time_format: this._config.time_format };
    }

    this._dateTimeFormat = new Intl.DateTimeFormat(this.hass.locale.language, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone:
        this._resolvedTimeZone?.trim() ||
        this._config?.time_zone ||
        resolveTimeZone(locale.time_zone, this.hass.config?.time_zone),
    });

    this._tick();
  }

  public getCardSize(): number {
    if (this._config?.clock_size === "small") return 1;
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    if (this._config?.clock_size === "medium") {
      return {
        min_rows: this._config?.title ? 2 : 1,
        rows: 2,
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
      rows: 1,
      max_rows: 4,
      min_columns: 3,
      columns: 6,
    };
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) return;

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass");
      if (!oldHass || oldHass.locale !== this.hass.locale) {
        this._initDate();
      }
    }

    if (changedProps.has("_config")) {
      this._tryConnect();
    }

    const shouldBeHidden =
      !!this._templateResult &&
      this._config.show_empty === false &&
      this._templateResult.result.length === 0;
    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as ClockCardConfig | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._startTick();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTick();
    this._tryDisconnect();
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
    this._timeSecond = this._config?.show_seconds
      ? parts.find((part) => part.type === "second")?.value
      : undefined;
    this._timeAmPm = parts.find((part) => part.type === "dayPeriod")?.value;
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (!this._config) return;

    if (!this._templateResult) {
      const key = this._computeCacheKey();
      if (templateCache.has(key)) {
        this._templateResult = templateCache.get(key);
      }
    }
  }

  private _computeCacheKey(): string {
    return JSON.stringify(this._config);
  }

  private async _tryConnect(): Promise<void> {
    if (!this.hass || !this._config) return;

    await this._tryDisconnect();

    if (this._config.content?.includes("{{")) {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          if ("error" in result) {
            this._error = result.error;
            this._errorLevel = result.level;
            return;
          }
          this._templateResult = result;
        },
        {
          template: this._config.content,
          entity_ids: this._config.entity_id,
          variables: {
            config: this._config,
            user: this.hass.user?.name,
          },
          strict: true,
          report_errors: this.preview,
        }
      );
    }

    if (this._config.time_zone?.includes("{{")) {
      this._unsubTimeZoneTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          if (!("error" in result)) {
            this._resolvedTimeZone = result.result;
            this._initDate(); 
          }
        },
        {
          template: this._config.time_zone,
          entity_ids: this._config.entity_id,
          variables: {
            config: this._config,
            user: this.hass.user?.name,
          },
        }
      );
    }
  }

  private async _tryDisconnect(): Promise<void> {
    if (this._unsubRenderTemplate) {
      this._unsubRenderTemplate.then((unsub) => unsub()).catch(() => {});
      this._unsubRenderTemplate = undefined;
    }

    if (this._unsubTimeZoneTemplate) {
      this._unsubTimeZoneTemplate.then((unsub) => unsub()).catch(() => {});
      this._unsubTimeZoneTemplate = undefined;
    }

    this._error = undefined;
    this._errorLevel = undefined;
  }

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-card>
        <div
          class="time-wrapper ${this._config.clock_size
            ? `size-${this._config.clock_size}`
            : ""}"
        >
          ${this._config.title !== undefined
            ? html`<div class="time-title">${this._config.title}</div>`
            : nothing}
          <div class="time-parts">
            <div class="time-part hour">${this._timeHour}</div>
            <div class="time-part minute">${this._timeMinute}</div>
            ${this._timeSecond !== undefined
              ? html`<div class="time-part second">${this._timeSecond}</div>`
              : nothing}
            ${this._timeAmPm !== undefined
              ? html`<div class="time-part am-pm">${this._timeAmPm}</div>`
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
      display: flex;
      height: calc(100% - 12px);
      align-items: center;
      flex-direction: column;
      justify-content: center;
      padding: 6px 8px;
      row-gap: 6px;
    }
    .time-wrapper.size-medium,
    .time-wrapper.size-large {
      height: calc(100% - 32px);
      padding: 16px;
      row-gap: 12px;
    }
    .time-title {
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
    .time-wrapper.size-medium .time-title {
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-condensed);
    }
    .time-wrapper.size-large .time-title {
      font-size: var(--ha-font-size-2xl);
      line-height: var(--ha-line-height-condensed);
    }
    .time-parts {
      align-items: center;
      display: grid;
      grid-template-areas:
        "hour minute second"
        "hour minute am-pm";
      font-size: 2rem;
      font-weight: var(--ha-font-weight-medium);
      line-height: 0.8;
      direction: ltr;
    }
    .time-title + .time-parts {
      font-size: 1.5rem;
    }
    .time-wrapper.size-medium .time-parts {
      font-size: 3rem;
    }
    .time-wrapper.size-large .time-parts {
      font-size: 4rem;
    }
    .time-wrapper.size-medium .time-parts .time-part.second,
    .time-wrapper.size-medium .time-parts .time-part.am-pm {
      font-size: var(--ha-font-size-l);
      margin-left: 6px;
    }
    .time-wrapper.size-large .time-parts .time-part.second,
    .time-wrapper.size-large .time-parts .time-part.am-pm {
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
    "hui-clock-card": HuiClockCard;
  }
}
