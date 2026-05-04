import { consume } from "@lit/context";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeCssColor } from "../../../common/color/compute-color";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-spinner";
import {
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import type { ForecastAttribute, ForecastEvent } from "../../../data/weather";
import {
  getForecastPrecipitation,
  subscribeForecast,
} from "../../../data/weather";
import type {
  HomeAssistant,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../../types";
import {
  DEFAULT_DAYS_TO_SHOW,
  DEFAULT_HOURS_TO_SHOW,
  MS_PER_HOUR,
  resolveForecastResolution,
  supportsForecast,
} from "./common/forecast";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  ForecastResolution,
  LovelaceCardFeatureContext,
  PrecipitationForecastCardFeatureConfig,
} from "./types";

const MAX_BAR_WIDTH = 16;

export const supportsPrecipitationForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsForecast(
    context.entity_id ? hass.states[context.entity_id] : undefined
  );

@customElement("hui-precipitation-forecast-card-feature")
class HuiPrecipitationForecastCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, LocalizeFunc>({
    transformer: ({ localize }) => localize,
  })
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection!: Connection;

  @state() private _config?: PrecipitationForecastCardFeatureConfig;

  @state() private _forecast?: ForecastAttribute[];

  @state() private _error?: string;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _subscribedType?: ForecastResolution;

  static getStubConfig(): PrecipitationForecastCardFeatureConfig {
    return {
      type: "precipitation-forecast",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-precipitation-forecast-card-feature-editor");
    return document.createElement(
      "hui-precipitation-forecast-card-feature-editor"
    ) as LovelaceCardFeatureEditor;
  }

  public setConfig(config: PrecipitationForecastCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeForecast();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeForecast();
  }

  protected firstUpdated() {
    this._subscribeForecast();
  }

  protected updated(changedProps: PropertyValues) {
    const resolvedType = this._resolvedForecastType();
    const contextChanged =
      changedProps.has("context") &&
      (changedProps.get("context") as LovelaceCardFeatureContext | undefined)
        ?.entity_id !== this.context?.entity_id;
    const configTypeChanged =
      changedProps.has("_config") && resolvedType !== this._subscribedType;
    if (contextChanged || configTypeChanged) {
      this._unsubscribeForecast();
      this._subscribeForecast();
    }
  }

  private _resolvedForecastType(): ForecastResolution | undefined {
    return resolveForecastResolution(
      this._stateObj,
      this._config?.forecast_type
    );
  }

  protected render() {
    if (!this._config || !this.context || !supportsForecast(this._stateObj)) {
      return nothing;
    }
    if (this._error) {
      return html`
        <div class="container">
          <div class="info">${this._error}</div>
        </div>
      `;
    }
    if (!this._forecast) {
      return html`
        <div class="container loading">
          <ha-spinner size="small"></ha-spinner>
        </div>
      `;
    }

    const isHourly = this._subscribedType === "hourly";
    const precipitationType = this._config.precipitation_type ?? "amount";
    const customColor = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;
    const fill = customColor ?? "var(--state-weather-rainy-color)";

    if (isHourly) {
      return html`
        <div class="container">
          ${this._renderHourlyBars(precipitationType, fill)}
        </div>
      `;
    }

    const daysToShow = this._config.days_to_show ?? DEFAULT_DAYS_TO_SHOW;
    const entriesPerDay = this._subscribedType === "twice_daily" ? 2 : 1;
    const entries = this._forecast.slice(0, daysToShow * entriesPerDay);

    if (!entries.length) {
      return html`
        <div class="container">
          <div class="info">
            ${this._localize(
              "ui.panel.lovelace.editor.features.types.precipitation-forecast.no_forecast"
            )}
          </div>
        </div>
      `;
    }

    return html`
      <div class="container">
        ${this._renderDailyBars(entries, precipitationType, fill)}
      </div>
    `;
  }

  private _renderDailyBars(
    entries: ForecastAttribute[],
    precipitationType: "amount" | "probability",
    fill: string
  ): TemplateResult {
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;
    const padding = 4;
    const minGap = 4;
    const slotWidth = width / entries.length;
    const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slotWidth - minGap));
    const drawableHeight = height - padding * 2;

    let maxPrecipitation = 0;
    if (precipitationType === "probability") {
      maxPrecipitation = 100;
    } else {
      for (const entry of entries) {
        const value = getForecastPrecipitation(entry, precipitationType);
        if (Number.isFinite(value)) {
          maxPrecipitation = Math.max(maxPrecipitation, value!);
        }
      }
    }

    const dotRadius = 1.5;
    const elements = entries.map((entry, i) => {
      const value = getForecastPrecipitation(entry, precipitationType);
      const x = slotWidth * i + slotWidth / 2;
      if (!Number.isFinite(value) || value! <= 0 || maxPrecipitation <= 0) {
        const cy = padding + drawableHeight - dotRadius;
        return svg`<circle
          cx=${x}
          cy=${cy}
          r=${dotRadius}
          fill=${fill}
          opacity="0.4"
        ></circle>`;
      }
      const barHeight = Math.max(
        1,
        (value! / maxPrecipitation) * drawableHeight
      );
      const y = padding + drawableHeight - barHeight;
      return svg`<rect
        x=${x - barWidth / 2}
        y=${y}
        width=${barWidth}
        height=${barHeight}
        fill=${fill}
        opacity="0.4"
      ></rect>`;
    });

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${elements}
      </svg>
    `;
  }

  private _renderHourlyBars(
    precipitationType: "amount" | "probability",
    fill: string
  ): TemplateResult | typeof nothing {
    if (!this._forecast?.length) {
      return nothing;
    }
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;
    const topPadding = 4;
    const drawableHeight = height - topPadding;

    const now = Date.now();
    const hoursToShow = this._config!.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
    const maxTime =
      Math.floor((now + hoursToShow * MS_PER_HOUR) / MS_PER_HOUR) * MS_PER_HOUR;
    const timeRange = maxTime - now;
    if (timeRange <= 0) {
      return nothing;
    }

    const inRange: { entry: ForecastAttribute; t: number }[] = [];
    for (const entry of this._forecast) {
      const t = new Date(entry.datetime).getTime();
      if (t >= now && t <= maxTime) {
        inRange.push({ entry, t });
      }
    }

    if (!inRange.length) {
      return nothing;
    }

    const entriesWithRain = inRange.filter(({ entry }) => {
      const value = getForecastPrecipitation(entry, precipitationType);
      return Number.isFinite(value) && value! > 0;
    });

    let maxPrecipitation = 0;
    if (precipitationType === "probability") {
      maxPrecipitation = 100;
    } else {
      for (const { entry } of entriesWithRain) {
        maxPrecipitation = Math.max(
          maxPrecipitation,
          getForecastPrecipitation(entry, precipitationType)!
        );
      }
    }

    const slotWidth = width / hoursToShow;
    const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slotWidth - 2));
    const dotRadius = 1.5;

    const elements = inRange.map(({ entry, t }) => {
      const value = getForecastPrecipitation(entry, precipitationType);
      const xCenter = ((t - now) / timeRange) * width;
      if (!Number.isFinite(value) || value! <= 0 || maxPrecipitation <= 0) {
        const cy = height - dotRadius;
        return svg`<circle
          cx=${xCenter}
          cy=${cy}
          r=${dotRadius}
          fill=${fill}
          opacity="0.4"
        ></circle>`;
      }
      const x = xCenter - barWidth / 2;
      const barHeight = Math.max(
        1,
        (value! / maxPrecipitation) * drawableHeight
      );
      const y = height - barHeight;
      return svg`<rect
        x=${x}
        y=${y}
        width=${barWidth}
        height=${barHeight}
        fill=${fill}
        opacity="0.4"
      ></rect>`;
    });

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${elements}
      </svg>
    `;
  }

  private _unsubscribeForecast() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
    this._subscribedType = undefined;
  }

  private async _subscribeForecast() {
    if (
      !this.context?.entity_id ||
      !this._config ||
      !this._connection ||
      this._subscribed
    ) {
      return;
    }

    const forecastType = this._resolvedForecastType();
    if (!forecastType) {
      return;
    }

    const entityId = this.context.entity_id;
    this._forecast = undefined;
    this._error = undefined;
    this._subscribedType = forecastType;

    this._subscribed = subscribeForecast(
      this._connection,
      entityId,
      forecastType,
      (forecastEvent: ForecastEvent) => {
        this._forecast = forecastEvent.forecast ?? [];
      }
    ).catch((err) => {
      this._subscribed = undefined;
      this._subscribedType = undefined;
      this._error = err.message || err.code;
      return undefined;
    });
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: var(--feature-height);
      flex-direction: column;
      justify-content: flex-end;
      align-items: stretch;
      pointer-events: none !important;
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      overflow: hidden;
    }

    .info {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    svg {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-precipitation-forecast-card-feature": HuiPrecipitationForecastCardFeature;
  }
}
