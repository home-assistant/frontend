import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-spinner";
import type { ForecastEvent } from "../../../data/weather";
import { subscribeForecast, WeatherEntityFeature } from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import { coordinates } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  HourlyForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const DEFAULT_HOURS_TO_SHOW = 24;

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
    if (!this._coordinates) {
      return html`
        <div class="container loading">
          <ha-spinner size="small"></ha-spinner>
        </div>
      `;
    }
    if (!this._coordinates.length) {
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
      <hui-graph-base
        .coordinates=${this._coordinates}
        .yAxisOrigin=${this._yAxisOrigin}
      ></hui-graph-base>
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
    const msPerHour = 60 * 60 * 1000;
    // Round down to the nearest hour so the axis aligns with forecast data points
    const maxTime =
      Math.floor((now + hoursToShow * msPerHour) / msPerHour) * msPerHour;

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
      this.hass,
      entityId,
      "hourly",
      (forecastEvent) => {
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
      align-items: flex-end;
      pointer-events: none !important;
    }

    .container.loading {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    hui-graph-base {
      width: 100%;
      --accent-color: var(--feature-color);
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-hourly-forecast-card-feature": HuiHourlyForecastCardFeature;
  }
}
