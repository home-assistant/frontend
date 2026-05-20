import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type {
  Connection,
  HassConfig,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { UNIT_F } from "../../../common/const";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { FrontendLocaleData } from "../../../data/translation";
import "../../../components/ha-spinner";
import {
  configContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import type {
  ForecastAttribute,
  ForecastEvent,
  WeatherEntity,
} from "../../../data/weather";
import { getWeatherUnit, subscribeForecast } from "../../../data/weather";
import type {
  HomeAssistant,
  HomeAssistantConfig,
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
import {
  getAbsoluteGradient,
  getRelativeGradient,
} from "./common/temperature-palette";
import {
  graphLabelsStyles,
  LABEL_GAP,
  LABEL_HEIGHT,
  renderDayLabels,
  renderHourLabels,
} from "./common/graph-labels";
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
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection!: Connection;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig?: HassConfig;

  @state() private _config?: TemperatureForecastCardFeatureConfig;

  @state() private _forecast?: ForecastAttribute[];

  @state() private _error?: string;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _subscribedType?: ForecastResolution;

  private _size = new ResizeController(this, {
    callback: (entries) => {
      const rect = entries?.[0]?.contentRect;
      if (!rect) return undefined;
      return { width: rect.width, height: rect.height };
    },
  });

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
    if (this._shouldResubscribe(changedProps)) {
      this._unsubscribeForecast();
      this._subscribeForecast();
    }
  }

  private _shouldResubscribe(changedProps: PropertyValues): boolean {
    if (changedProps.has("context")) {
      const previous = changedProps.get("context") as
        | LovelaceCardFeatureContext
        | undefined;
      if (previous?.entity_id !== this.context?.entity_id) return true;
    }
    if (changedProps.has("_config")) {
      if (this._resolvedForecastType() !== this._subscribedType) return true;
    }
    return false;
  }

  private _resolvedForecastType(): ForecastResolution | undefined {
    return resolveForecastResolution(
      this._stateObj,
      this._config?.forecast_type
    );
  }

  private get _showLabels(): boolean {
    return this._config?.show_labels !== false;
  }

  private _toCelsius(temp: number): number {
    const isFahrenheit =
      this._hassConfig && this._stateObj
        ? getWeatherUnit(
            this._hassConfig,
            this._stateObj as WeatherEntity,
            "temperature"
          ) === UNIT_F
        : false;
    return isFahrenheit ? ((temp - 32) * 5) / 9 : temp;
  }

  protected render() {
    if (!this._config || !this.context || !supportsForecast(this._stateObj)) {
      return nothing;
    }
    if (this._error) {
      return html`
        <div class="container">
          <div class="info">
            ${this._localize(
              "ui.panel.lovelace.editor.features.types.temperature-forecast.failed_to_load",
              { error: this._error }
            )}
          </div>
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

    const containerClasses = classMap({
      container: true,
      "with-labels": this._showLabels,
    });

    if (isHourly) {
      const hourly = this._computeHourly();
      if (!hourly?.coordinates.length) {
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
      const hoursToShow = this._config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
      return html`
        <div class=${containerClasses}>
          <div class="bars">
            <hui-graph-base
              .coordinates=${hourly.coordinates}
              .yAxisOrigin=${hourly.yAxisOrigin}
              .gradient=${customColor ? undefined : hourly.gradient}
              style=${graphStyle}
            ></hui-graph-base>
          </div>
          ${this._showLabels && this._locale
            ? renderHourLabels(hoursToShow, this._locale)
            : nothing}
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
      <div class=${containerClasses}>
        <div class="bars">${this._renderBars(entries, customColor)}</div>
        ${this._showLabels && this._locale
          ? renderDayLabels(entries, entriesPerDay, this._locale)
          : nothing}
      </div>
    `;
  }

  private _renderBars(
    entries: ForecastAttribute[],
    customColor: string | undefined
  ): TemplateResult {
    const width = this._size.value?.width || this.clientWidth;
    const height = this._size.value?.height || this.clientHeight;
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

    const gradients = customColor
      ? undefined
      : entries.map(
          (entry, i) => svg`<linearGradient
            id="temp-bar-${i}"
            x1="0" y1="0" x2="0" y2="1"
          >
            ${getRelativeGradient(
              this._toCelsius(entry.templow!),
              this._toCelsius(entry.temperature),
              3
            ).map(
              (s) => svg`<stop offset=${s.offset} stop-color=${s.color}></stop>`
            )}
          </linearGradient>`
        );

    const bars = entries.map((entry, i) => {
      const x = slotWidth * i + (slotWidth - barWidth) / 2;
      const yHigh = yFor(entry.temperature);
      const yLow = yFor(entry.templow!);
      const barHeight = Math.max(1, yLow - yHigh);
      const rx = Math.min(barWidth / 2, barHeight / 2);
      const fill = customColor ?? `url(#temp-bar-${i})`;
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
        ${gradients ? svg`<defs>${gradients}</defs>` : nothing}${bars}
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

  private _computeHourly():
    | {
        coordinates: [number, number][];
        yAxisOrigin: number;
        gradient: HuiGraphGradient;
      }
    | undefined {
    if (!this._forecast?.length || !this._stateObj) {
      return undefined;
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

    for (const entry of this._forecast) {
      if (entry.temperature != null && !Number.isNaN(entry.temperature)) {
        const time = new Date(entry.datetime).getTime();
        if (time > maxTime) break;
        if (time < now) continue;
        data.push([time, entry.temperature]);
      }
    }

    if (!data.length) {
      return undefined;
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

    const size = this._size.value;
    const width = size?.width || this.clientWidth;
    const labelSpace = this._showLabels ? LABEL_HEIGHT + LABEL_GAP : 0;
    const height = Math.max(
      1,
      (size?.height || this.clientHeight) - labelSpace
    );

    const { points, yAxisOrigin } = coordinates(
      data,
      width,
      height,
      data.length,
      { minX: now, maxX: maxTime, minY, maxY }
    );
    // coordinates() pads with a trailing step-line point at x=width; drop it so the curve ends at the last forecast point.
    points.pop();

    // calcPoints (inside coordinates()) adds an extra 10% padding on top of
    // what we pass, so the curve actually lives in this expanded range.
    const padRange = maxY - minY || minY * 0.1;
    const effMinY = minY - padRange * 0.1;
    const effMaxY = maxY + padRange * 0.1;
    const gradient: HuiGraphGradient = {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: height,
      stops: getAbsoluteGradient(
        this._toCelsius(effMinY),
        this._toCelsius(effMaxY)
      ),
    };

    return { coordinates: points, yAxisOrigin, gradient };
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

  static styles = [
    graphLabelsStyles,
    css`
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
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        border-bottom-right-radius: 8px;
        border-bottom-left-radius: 8px;
        overflow: hidden;
      }

      .container.with-labels {
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
      }

      .bars {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: stretch;
      }

      .container.with-labels .bars {
        padding-bottom: 2px;
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-temperature-forecast-card-feature": HuiTemperatureForecastCardFeature;
  }
}
