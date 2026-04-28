import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-spinner";
import type { ForecastAttribute, ForecastEvent } from "../../../data/weather";
import {
  getForecastPrecipitation,
  subscribeForecast,
  WeatherEntityFeature,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import { coordinates } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  HourlyForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const DEFAULT_HOURS_TO_SHOW = 24;

const MS_PER_HOUR = 60 * 60 * 1000;
const MAX_RAIN_BAR_WIDTH = 16;

export const supportsHourlyForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "weather" &&
    supportsFeature(stateObj, WeatherEntityFeature.FORECAST_HOURLY)
  );
};

@customElement("hui-hourly-forecast-card-feature")
class HuiHourlyForecastCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false, hasChanged: () => false })
  public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HourlyForecastCardFeatureConfig;

  @state() private _forecast?: ForecastAttribute[];

  @state() private _coordinates?: [number, number][];

  @state() private _yAxisOrigin?: number;

  @state() private _error?: string;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  static getStubConfig(): HourlyForecastCardFeatureConfig {
    return {
      type: "hourly-forecast",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-hourly-forecast-card-feature-editor");
    return document.createElement(
      "hui-hourly-forecast-card-feature-editor"
    ) as LovelaceCardFeatureEditor;
  }

  public setConfig(config: HourlyForecastCardFeatureConfig): void {
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

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("context")) {
      const oldContext = changedProps.get("context") as
        | LovelaceCardFeatureContext
        | undefined;
      if (oldContext?.entity_id !== this.context?.entity_id) {
        this._unsubscribeForecast();
        this._subscribeForecast();
      }
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !supportsHourlyForecastCardFeature(this.hass, this.context)
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
    if (!this._forecast || !this._coordinates) {
      return html`
        <div class="container loading">
          <ha-spinner size="small"></ha-spinner>
        </div>
      `;
    }

    const showTemperature = this._config.show_temperature ?? true;
    const showPrecipitation = this._config.show_precipitation ?? false;

    const showDots = !showTemperature && showPrecipitation;
    const layer =
      showPrecipitation || showDots
        ? this._renderForecastLayer(showPrecipitation, showDots)
        : nothing;
    const hasGraphData = this._coordinates.length > 0;
    const showGraph = showTemperature && hasGraphData;

    if (!showGraph && layer === nothing) {
      return html`
        <div class="container">
          <div class="info">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.features.types.hourly-forecast.no_forecast"
            )}
          </div>
        </div>
      `;
    }

    return html`
      <div class="layers">
        ${layer}
        ${showGraph
          ? html`
              <hui-graph-base
                .coordinates=${this._coordinates}
                .yAxisOrigin=${this._yAxisOrigin}
              ></hui-graph-base>
            `
          : nothing}
      </div>
    `;
  }

  private _renderForecastLayer(showRain: boolean, showDots: boolean) {
    if (!this._forecast?.length) {
      return nothing;
    }
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;
    // No bottom padding so bars and dots line up with the line graph baseline.
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

    const precipitationType = this._config!.precipitation_type ?? "amount";

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

    const rainRects: TemplateResult[] = [];
    if (showRain) {
      const rainEntries = inRange.filter(({ entry }) => {
        const value = getForecastPrecipitation(entry, precipitationType);
        return Number.isFinite(value) && value! > 0;
      });
      let maxPrecipitation = 0;
      if (precipitationType === "probability") {
        maxPrecipitation = 100;
      } else {
        for (const { entry } of rainEntries) {
          maxPrecipitation = Math.max(
            maxPrecipitation,
            getForecastPrecipitation(entry, precipitationType)!
          );
        }
      }
      if (maxPrecipitation > 0 && rainEntries.length) {
        const slotWidth = width / hoursToShow;
        const barWidth = Math.max(
          1,
          Math.min(MAX_RAIN_BAR_WIDTH, slotWidth - 2)
        );
        for (const { entry, t } of rainEntries) {
          const value = getForecastPrecipitation(entry, precipitationType)!;
          const xCenter = ((t - now) / timeRange) * width;
          const x = xCenter - barWidth / 2;
          const barHeight = Math.max(
            1,
            (value / maxPrecipitation) * drawableHeight
          );
          const y = height - barHeight;
          rainRects.push(svg`<rect
            x=${x}
            y=${y}
            width=${barWidth}
            height=${barHeight}
            fill="var(--state-weather-rainy-color)"
            opacity="0.4"
          ></rect>`);
        }
      }
    }

    const dots: TemplateResult[] = [];
    if (showDots) {
      const dotRadius = 1.5;
      const cy = height - dotRadius;
      for (const { entry, t } of inRange) {
        const value = getForecastPrecipitation(entry, precipitationType);
        if (Number.isFinite(value) && value! > 0) {
          continue;
        }
        const cx = ((t - now) / timeRange) * width;
        dots.push(svg`<circle
          cx=${cx}
          cy=${cy}
          r=${dotRadius}
          fill="var(--state-weather-rainy-color)"
          opacity="0.4"
        ></circle>`);
      }
    }

    if (!rainRects.length && !dots.length) {
      return nothing;
    }

    return html`
      <svg
        class="rain"
        width="100%"
        height="100%"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${dots}${rainRects}
      </svg>
    `;
  }

  private _unsubscribeForecast() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
  }

  private _computeCoordinates(forecastEvent: ForecastEvent) {
    const entityId = this.context!.entity_id!;
    const stateObj = this.hass!.states[entityId];

    if (!forecastEvent.forecast?.length) {
      this._coordinates = [];
      return;
    }

    const data: [number, number][] = [];
    const now = Date.now();
    const hoursToShow = this._config!.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
    // Round down to the nearest hour so the axis aligns with forecast data points
    const maxTime =
      Math.floor((now + hoursToShow * MS_PER_HOUR) / MS_PER_HOUR) * MS_PER_HOUR;

    // Start with current temperature
    const currentTemp = stateObj?.attributes?.temperature;
    if (currentTemp != null && !Number.isNaN(Number(currentTemp))) {
      data.push([now, Number(currentTemp)]);
    }

    // Add forecast data points for the next 24 hours
    for (const entry of forecastEvent.forecast) {
      if (entry.temperature != null && !Number.isNaN(entry.temperature)) {
        const time = new Date(entry.datetime).getTime();
        if (time > maxTime) break;
        if (time < now) continue;
        data.push([time, entry.temperature]);
      }
    }

    if (!data.length) {
      this._coordinates = [];
      return;
    }

    const { points, yAxisOrigin } = coordinates(
      data,
      this.clientWidth,
      this.clientHeight,
      data.length,
      { minX: now, maxX: maxTime }
    );
    // Remove the trailing flat extension point added by calcPoints
    points.pop();
    this._coordinates = points;
    this._yAxisOrigin = yAxisOrigin;
  }

  private async _subscribeForecast() {
    if (
      !this.context?.entity_id ||
      !this._config ||
      !this.hass ||
      this._subscribed
    ) {
      return;
    }

    const entityId = this.context.entity_id;

    this._subscribed = subscribeForecast(
      this.hass.connection,
      entityId,
      "hourly",
      (forecastEvent) => {
        this._forecast = forecastEvent.forecast ?? [];
        this._computeCoordinates(forecastEvent);
      }
    ).catch((err) => {
      this._subscribed = undefined;
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
    }

    .info {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    .layers {
      position: relative;
      width: 100%;
      height: 100%;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      overflow: hidden;
    }

    .rain {
      position: absolute;
      inset: 0;
      display: block;
    }

    hui-graph-base {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      --accent-color: var(--feature-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-hourly-forecast-card-feature": HuiHourlyForecastCardFeature;
  }
}
