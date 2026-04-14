import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { formatDateWeekdayShort } from "../../../common/datetime/format_date";
import { formatTime } from "../../../common/datetime/format_time";
import { formatNumber } from "../../../common/number/format_number";
import { DragScrollController } from "../../../common/controllers/drag-scroll-controller";
import type {
  ForecastAttribute,
  ForecastEvent,
  ModernForecastType,
  WeatherEntity,
} from "../../../data/weather";
import {
  getDefaultForecastType,
  getForecast,
  getWeatherStateIcon,
  subscribeForecast,
  weatherSVGStyles,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureContext,
  WeatherForecastCardFeatureConfig,
} from "./types";

const DEFAULT_FORECAST_SLOTS = 5;

export const supportsWeatherForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? (hass.states[context.entity_id] as WeatherEntity | undefined)
    : undefined;

  if (!stateObj || computeDomain(stateObj.entity_id) !== "weather") {
    return false;
  }

  return Boolean(
    getDefaultForecastType(stateObj) ||
    (stateObj.attributes.forecast?.length || 0) > 2
  );
};

@customElement("hui-weather-forecast-card-feature")
class HuiWeatherForecastCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: WeatherForecastCardFeatureConfig;

  @state() private _forecastEvent?: ForecastEvent;

  @state() private _forecastType?: ModernForecastType;

  @state() private _subscribed?: Promise<() => void>;

  private _dragScrollController = new DragScrollController(this, {
    selector: ".forecast",
    enabled: false,
  });

  static getStubConfig(): WeatherForecastCardFeatureConfig {
    return {
      type: "weather-forecast",
    };
  }

  public setConfig(config: WeatherForecastCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeForecastEvents();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeForecastEvents();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    const nextForecastType = this._stateObj
      ? getDefaultForecastType(this._stateObj)
      : undefined;
    const forecastTypeChanged = nextForecastType !== this._forecastType;
    if (forecastTypeChanged) {
      this._forecastType = nextForecastType;
    }

    if (
      changedProps.has("context") ||
      changedProps.has("_config") ||
      forecastTypeChanged ||
      !this._subscribed
    ) {
      this._subscribeForecastEvents();
    }

    this._dragScrollController.enabled = Boolean(this._forecast?.length);
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsWeatherForecastCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const forecast = this._forecast;

    if (!forecast?.length) {
      return nothing;
    }

    const forecastType = getForecast(
      this._stateObj.attributes,
      this._forecastEvent,
      this._forecastType ?? "legacy"
    )?.type;
    const hourly = forecastType === "hourly";
    const dayNight = forecastType === "twice_daily";

    return html`
      <div
        class=${classMap({
          forecast: true,
          dragging: this._dragScrollController.scrolling,
        })}
      >
        ${forecast.map(
          (item) => html`
            <div class="item">
              <div class="label">
                ${this._labelForForecast(item, hourly, dayNight)}
              </div>
              ${item.condition
                ? html`
                    <div class="icon">
                      ${getWeatherStateIcon(
                        item.condition,
                        this,
                        !(item.is_daytime || item.is_daytime === undefined)
                      )}
                    </div>
                  `
                : nothing}
              <div class="temp">
                ${item.temperature !== undefined && item.temperature !== null
                  ? `${formatNumber(item.temperature, this.hass!.locale)}°`
                  : "—"}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private get _stateObj() {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as
      | WeatherEntity
      | undefined;
  }

  private get _forecast() {
    const stateObj = this._stateObj;
    if (!stateObj) {
      return undefined;
    }
    return getForecast(
      stateObj.attributes,
      this._forecastEvent,
      this._forecastType ?? "legacy"
    )?.forecast?.slice(0, DEFAULT_FORECAST_SLOTS);
  }

  private _unsubscribeForecastEvents() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    this._forecastEvent = undefined;
  }

  private _subscribeForecastEvents() {
    this._unsubscribeForecastEvents();
    if (
      !this.isConnected ||
      !this.hass ||
      !this._stateObj ||
      !this._forecastType
    ) {
      return;
    }

    this._subscribed = subscribeForecast(
      this.hass,
      this._stateObj.entity_id,
      this._forecastType,
      (event) => {
        this._forecastEvent = event;
      }
    );
  }

  private _labelForForecast(
    item: ForecastAttribute,
    hourly: boolean,
    dayNight: boolean
  ) {
    if (hourly) {
      return formatTime(
        new Date(item.datetime),
        this.hass!.locale,
        this.hass!.config
      );
    }
    if (dayNight) {
      return item.is_daytime !== false
        ? this.hass!.localize("ui.card.weather.day")
        : this.hass!.localize("ui.card.weather.night");
    }
    return formatDateWeekdayShort(
      new Date(item.datetime),
      this.hass!.locale,
      this.hass!.config
    );
  }

  static styles = [
    weatherSVGStyles,
    css`
      :host {
        display: block;
        width: 100%;
        pointer-events: auto;
      }

      .forecast {
        display: flex;
        align-items: flex-start;
        gap: var(--ha-space-2);
        max-width: 100%;
        overflow: auto;
        scrollbar-color: var(--scrollbar-thumb-color) transparent;
        scrollbar-width: none;
        mask-image: linear-gradient(
          90deg,
          transparent 0%,
          black 16px,
          black calc(100% - 16px),
          transparent 100%
        );
        user-select: none;
        cursor: grab;
      }

      .forecast.dragging {
        cursor: grabbing;
      }

      .forecast.dragging * {
        pointer-events: none;
      }

      .forecast::-webkit-scrollbar {
        display: none;
      }

      .forecast::before,
      .forecast::after {
        content: "";
        position: relative;
        display: block;
        min-width: 8px;
        height: 1px;
        flex: 0 0 auto;
      }

      .item {
        display: flex;
        min-width: 54px;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--ha-space-1);
      }

      .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
        line-height: 1;
        white-space: nowrap;
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
      }

      .icon > * {
        width: 100%;
        height: 100%;
        --mdc-icon-size: 28px;
      }

      .temp {
        font-size: var(--ha-font-size-m);
        line-height: var(--ha-line-height-condensed);
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-feature": HuiWeatherForecastCardFeature;
  }
}
