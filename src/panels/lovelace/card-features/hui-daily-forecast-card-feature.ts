import { consume } from "@lit/context";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { slugify } from "../../../common/string/slugify";
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
  WeatherEntityFeature,
} from "../../../data/weather";
import type {
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  DailyForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const DEFAULT_DAYS_TO_SHOW = 7;

const MAX_BAR_WIDTH = 8;

export type DailyForecastType = "daily" | "twice_daily";

export const supportsDailyForecastCardFeature = (
  stateObj: HassEntity | undefined
) => {
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "weather" &&
    (supportsFeature(stateObj, WeatherEntityFeature.FORECAST_DAILY) ||
      supportsFeature(stateObj, WeatherEntityFeature.FORECAST_TWICE_DAILY))
  );
};

export const resolveDailyForecastType = (
  stateObj: HassEntity | undefined,
  configured?: DailyForecastType
): DailyForecastType | undefined => {
  if (!stateObj) return undefined;
  const supportsDaily = supportsFeature(
    stateObj,
    WeatherEntityFeature.FORECAST_DAILY
  );
  const supportsTwiceDaily = supportsFeature(
    stateObj,
    WeatherEntityFeature.FORECAST_TWICE_DAILY
  );
  if (configured === "daily" && supportsDaily) return "daily";
  if (configured === "twice_daily" && supportsTwiceDaily) return "twice_daily";
  if (supportsDaily) return "daily";
  if (supportsTwiceDaily) return "twice_daily";
  return undefined;
};

@customElement("hui-daily-forecast-card-feature")
class HuiDailyForecastCardFeature
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

  @state() private _config?: DailyForecastCardFeatureConfig;

  @state() private _forecast?: ForecastAttribute[];

  @state() private _error?: string;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _subscribedType?: DailyForecastType;

  static getStubConfig(): DailyForecastCardFeatureConfig {
    return {
      type: "daily-forecast",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-daily-forecast-card-feature-editor");
    return document.createElement(
      "hui-daily-forecast-card-feature-editor"
    ) as LovelaceCardFeatureEditor;
  }

  public setConfig(config: DailyForecastCardFeatureConfig): void {
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

  private _resolvedForecastType(): DailyForecastType | undefined {
    return resolveDailyForecastType(
      this._stateObj,
      this._config?.forecast_type
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !supportsDailyForecastCardFeature(this._stateObj)
    ) {
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

    const showTemperature = this._config.show_temperature ?? true;
    const showPrecipitation = this._config.show_precipitation ?? false;

    const daysToShow = this._config.days_to_show ?? DEFAULT_DAYS_TO_SHOW;
    const entriesPerDay = this._subscribedType === "twice_daily" ? 2 : 1;
    const entries = this._forecast
      .filter((entry) => {
        if (showTemperature) {
          return (
            Number.isFinite(entry.temperature) && Number.isFinite(entry.templow)
          );
        }
        return showPrecipitation;
      })
      .slice(0, daysToShow * entriesPerDay);

    if (!entries.length) {
      return html`
        <div class="container">
          <div class="info">
            ${this._localize(
              "ui.panel.lovelace.editor.features.types.daily-forecast.no_forecast"
            )}
          </div>
        </div>
      `;
    }

    return html` <div class="container">${this._renderChart(entries)}</div> `;
  }

  private _renderChart(entries: ForecastAttribute[]): TemplateResult {
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;
    const padding = 4;
    const minGap = 4;
    const slotWidth = width / entries.length;
    const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slotWidth - minGap));
    const drawableHeight = height - padding * 2;

    const showTemperature = this._config!.show_temperature ?? true;
    const showCurrentTemperature =
      this._config!.show_current_temperature ?? true;
    const showPrecipitation = this._config!.show_precipitation ?? false;
    const precipitationType = this._config!.precipitation_type ?? "amount";

    const currentTemp = Number(this._stateObj?.attributes?.temperature);
    const hasCurrentTemp = Number.isFinite(currentTemp);

    let yFor: ((value: number) => number) | undefined;
    if (showTemperature) {
      let tempMin = Infinity;
      let tempMax = -Infinity;
      for (const entry of entries) {
        if (
          Number.isFinite(entry.templow) &&
          Number.isFinite(entry.temperature)
        ) {
          tempMin = Math.min(tempMin, entry.templow!);
          tempMax = Math.max(tempMax, entry.temperature);
        }
      }
      if (hasCurrentTemp) {
        tempMin = Math.min(tempMin, currentTemp);
        tempMax = Math.max(tempMax, currentTemp);
      }
      if (tempMin === tempMax) {
        tempMin -= 1;
        tempMax += 1;
      }
      yFor = (value: number) =>
        padding +
        drawableHeight -
        ((value - tempMin) / (tempMax - tempMin)) * drawableHeight;
    }

    let maxPrecipitation = 0;
    if (showPrecipitation) {
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
    }

    const rainBarWidth = Math.max(
      barWidth,
      Math.min(barWidth + 8, slotWidth - 2)
    );

    const precipitationBars =
      showPrecipitation && maxPrecipitation > 0
        ? entries.map((entry, i) => {
            const value = getForecastPrecipitation(entry, precipitationType);
            if (!Number.isFinite(value) || value! <= 0) {
              return nothing;
            }
            const x = slotWidth * i + (slotWidth - rainBarWidth) / 2;
            const barHeight = Math.max(
              1,
              (value! / maxPrecipitation) * drawableHeight
            );
            const y = padding + drawableHeight - barHeight;
            return svg`<rect
              x=${x}
              y=${y}
              width=${rainBarWidth}
              height=${barHeight}
              fill="var(--state-weather-rainy-color)"
              opacity="0.4"
            ></rect>`;
          })
        : nothing;

    const bars =
      showTemperature && yFor
        ? entries.map((entry, i) => {
            if (
              !Number.isFinite(entry.temperature) ||
              !Number.isFinite(entry.templow)
            ) {
              return nothing;
            }
            const x = slotWidth * i + (slotWidth - barWidth) / 2;
            const yHigh = yFor(entry.temperature);
            const yLow = yFor(entry.templow!);
            const barHeight = Math.max(1, yLow - yHigh);
            const rx = Math.min(barWidth / 2, barHeight / 2);
            const fill = entry.condition
              ? `var(--state-weather-${slugify(entry.condition, "_")}-color, var(--feature-color))`
              : "var(--feature-color)";
            return svg`<rect
              x=${x}
              y=${yHigh}
              width=${barWidth}
              height=${barHeight}
              rx=${rx}
              ry=${rx}
              fill=${fill}
            ></rect>`;
          })
        : nothing;

    const currentTempLine =
      showTemperature && showCurrentTemperature && yFor && hasCurrentTemp
        ? svg`<line
            x1="0"
            x2=${width}
            y1=${yFor(currentTemp)}
            y2=${yFor(currentTemp)}
            stroke="var(--feature-color)"
            stroke-width="1"
            stroke-opacity="0.5"
            vector-effect="non-scaling-stroke"
          ></line>`
        : nothing;

    const dotRadius = 1.5;
    const dots = !showTemperature
      ? entries.map((entry, i) => {
          const value = getForecastPrecipitation(entry, precipitationType);
          if (Number.isFinite(value) && value! > 0) {
            return nothing;
          }
          const cx = slotWidth * i + slotWidth / 2;
          const cy = padding + drawableHeight - dotRadius;
          return svg`<circle
            cx=${cx}
            cy=${cy}
            r=${dotRadius}
            fill="var(--state-weather-rainy-color)"
            opacity="0.4"
          ></circle>`;
        })
      : nothing;

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${dots}${precipitationBars}${bars}${currentTempLine}
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
    "hui-daily-forecast-card-feature": HuiDailyForecastCardFeature;
  }
}
