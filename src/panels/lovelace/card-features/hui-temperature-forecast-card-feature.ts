import { consume } from "@lit/context";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
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
import { subscribeForecast } from "../../../data/weather";
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
import { coordinates } from "../common/graph/coordinates";
import type { HuiGraphGradient } from "../components/hui-graph-base";
import "../components/hui-graph-base";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  ForecastResolution,
  LovelaceCardFeatureContext,
  TemperatureForecastCardFeatureConfig,
} from "./types";

const MAX_BAR_WIDTH = 8;

const TEMP_GRADIENT_STOPS: { tempC: number; cssVar: string }[] = [
  { tempC: -20, cssVar: "--feature-temperature-freezing-color" },
  { tempC: 0, cssVar: "--feature-temperature-cold-color" },
  { tempC: 15, cssVar: "--feature-temperature-mild-color" },
  { tempC: 25, cssVar: "--feature-temperature-warm-color" },
  { tempC: 40, cssVar: "--feature-temperature-hot-color" },
];

export const supportsTemperatureForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsForecast(
    context.entity_id ? hass.states[context.entity_id] : undefined
  );

@customElement("hui-temperature-forecast-card-feature")
class HuiTemperatureForecastCardFeature
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

  @state() private _config?: TemperatureForecastCardFeatureConfig;

  @state() private _forecast?: ForecastAttribute[];

  @state() private _hourly?: {
    coordinates: [number, number][];
    yAxisOrigin: number;
    gradient?: HuiGraphGradient;
  };

  @state() private _error?: string;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _subscribedType?: ForecastResolution;

  static getStubConfig(): TemperatureForecastCardFeatureConfig {
    return {
      type: "temperature-forecast",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-temperature-forecast-card-feature-editor");
    return document.createElement(
      "hui-temperature-forecast-card-feature-editor"
    ) as LovelaceCardFeatureEditor;
  }

  public setConfig(config: TemperatureForecastCardFeatureConfig): void {
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
    const customColor = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;

    if (isHourly) {
      if (!this._hourly?.coordinates.length) {
        return html`
          <div class="container">
            <div class="info">
              ${this._localize(
                "ui.panel.lovelace.editor.features.types.temperature-forecast.no_forecast"
              )}
            </div>
          </div>
        `;
      }
      const graphStyle = customColor
        ? styleMap({ "--feature-color": customColor })
        : nothing;
      return html`
        <div class="container">
          <hui-graph-base
            .coordinates=${this._hourly.coordinates}
            .yAxisOrigin=${this._hourly.yAxisOrigin}
            .gradient=${customColor ? undefined : this._hourly.gradient}
            style=${graphStyle}
          ></hui-graph-base>
        </div>
      `;
    }

    const daysToShow = this._config.days_to_show ?? DEFAULT_DAYS_TO_SHOW;
    const entriesPerDay = this._subscribedType === "twice_daily" ? 2 : 1;
    const entries = this._forecast
      .filter(
        (entry) =>
          Number.isFinite(entry.temperature) && Number.isFinite(entry.templow)
      )
      .slice(0, daysToShow * entriesPerDay);

    if (!entries.length) {
      return html`
        <div class="container">
          <div class="info">
            ${this._localize(
              "ui.panel.lovelace.editor.features.types.temperature-forecast.no_forecast"
            )}
          </div>
        </div>
      `;
    }

    return html`
      <div class="container">${this._renderBars(entries, customColor)}</div>
    `;
  }

  private _renderBars(
    entries: ForecastAttribute[],
    customColor: string | undefined
  ): TemplateResult {
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;
    const padding = 4;
    const minGap = 4;
    const slotWidth = width / entries.length;
    const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slotWidth - minGap));
    const drawableHeight = height - padding * 2;

    let tempMin = Infinity;
    let tempMax = -Infinity;
    for (const entry of entries) {
      tempMin = Math.min(tempMin, entry.templow!);
      tempMax = Math.max(tempMax, entry.temperature);
    }
    if (tempMin === tempMax) {
      tempMin -= 1;
      tempMax += 1;
    }
    const yFor = (value: number) =>
      padding +
      drawableHeight -
      ((value - tempMin) / (tempMax - tempMin)) * drawableHeight;

    const isFahrenheit = this._stateObj?.attributes?.temperature_unit === "°F";
    const toDisplayUnit = (tempC: number) =>
      isFahrenheit ? (tempC * 9) / 5 + 32 : tempC;

    const tempGradient = !customColor
      ? (() => {
          const stops = TEMP_GRADIENT_STOPS.map((stop) => ({
            y: yFor(toDisplayUnit(stop.tempC)),
            cssVar: stop.cssVar,
          })).sort((a, b) => a.y - b.y);
          const y1 = stops[0].y;
          const y2 = stops[stops.length - 1].y;
          const range = y2 - y1 || 1;
          return svg`<defs>
            <linearGradient
              id="temp-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0" y1=${y1}
              x2="0" y2=${y2}
            >
              ${stops.map(
                (stop) =>
                  svg`<stop
                    offset=${(stop.y - y1) / range}
                    style="stop-color: var(${stop.cssVar})"
                  ></stop>`
              )}
            </linearGradient>
          </defs>`;
        })()
      : nothing;

    const bars = entries.map((entry, i) => {
      const x = slotWidth * i + (slotWidth - barWidth) / 2;
      const yHigh = yFor(entry.temperature);
      const yLow = yFor(entry.templow!);
      const barHeight = Math.max(1, yLow - yHigh);
      const rx = Math.min(barWidth / 2, barHeight / 2);
      const fill = customColor ?? "url(#temp-gradient)";
      return svg`<rect
        x=${x}
        y=${yHigh}
        width=${barWidth}
        height=${barHeight}
        rx=${rx}
        ry=${rx}
        fill=${fill}
      ></rect>`;
    });

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${tempGradient}${bars}
      </svg>
    `;
  }

  private _unsubscribeForecast() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
    this._subscribedType = undefined;
    this._hourly = undefined;
  }

  private _computeHourly(forecast: ForecastAttribute[]) {
    if (!forecast.length || !this._stateObj) {
      this._hourly = undefined;
      return;
    }

    const data: [number, number][] = [];
    const now = Date.now();
    const hoursToShow = this._config!.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
    const maxTime =
      Math.floor((now + hoursToShow * MS_PER_HOUR) / MS_PER_HOUR) * MS_PER_HOUR;

    const currentTemp = this._stateObj.attributes?.temperature;
    if (currentTemp != null && !Number.isNaN(Number(currentTemp))) {
      data.push([now, Number(currentTemp)]);
    }

    for (const entry of forecast) {
      if (entry.temperature != null && !Number.isNaN(entry.temperature)) {
        const time = new Date(entry.datetime).getTime();
        if (time > maxTime) break;
        if (time < now) continue;
        data.push([time, entry.temperature]);
      }
    }

    if (!data.length) {
      this._hourly = undefined;
      return;
    }

    let dataMin = data[0][1];
    let dataMax = data[0][1];
    for (const [, t] of data) {
      if (t < dataMin) dataMin = t;
      if (t > dataMax) dataMax = t;
    }
    const range = dataMax - dataMin || dataMin * 0.1;
    const minY = dataMin - range * 0.1;
    const maxY = dataMax + range * 0.1;

    const width = this.clientWidth || 300;
    const height = this.clientHeight || 42;

    const { points, yAxisOrigin } = coordinates(
      data,
      width,
      height,
      data.length,
      { minX: now, maxX: maxTime, minY, maxY }
    );
    points.pop();

    const isFahrenheit = this._stateObj.attributes?.temperature_unit === "°F";
    const toDisplayUnit = (tempC: number) =>
      isFahrenheit ? (tempC * 9) / 5 + 32 : tempC;
    const yFor = (temp: number) =>
      height - ((temp - minY) / (maxY - minY || 1)) * height;

    const stops = TEMP_GRADIENT_STOPS.map((stop) => ({
      y: yFor(toDisplayUnit(stop.tempC)),
      cssVar: stop.cssVar,
    })).sort((a, b) => a.y - b.y);
    const y1 = stops[0].y;
    const y2 = stops[stops.length - 1].y;
    const gradientRange = y2 - y1 || 1;

    const gradient: HuiGraphGradient = {
      x1: 0,
      y1,
      x2: 0,
      y2,
      stops: stops.map((stop) => ({
        offset: (stop.y - y1) / gradientRange,
        color: `var(${stop.cssVar})`,
      })),
    };

    this._hourly = { coordinates: points, yAxisOrigin, gradient };
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
        if (this._subscribedType === "hourly") {
          this._computeHourly(this._forecast);
        }
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
      --feature-temperature-freezing-color: #a89bd8;
      --feature-temperature-cold-color: #7dc8dc;
      --feature-temperature-mild-color: #a8dc7c;
      --feature-temperature-warm-color: #e89042;
      --feature-temperature-hot-color: #d24530;
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

    hui-graph-base {
      width: 100%;
      height: 100%;
      --accent-color: var(--feature-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-temperature-forecast-card-feature": HuiTemperatureForecastCardFeature;
  }
}
