import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import {
  mdiEye,
  mdiGauge,
  mdiThermometer,
  mdiWaterPercent,
  mdiWeatherWindy,
} from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDateWeekdayDay } from "../../../common/datetime/format_date";
import { formatTimeWeekday } from "../../../common/datetime/format_time";
import "../../../components/ha-svg-icon";
import {
  ForecastEvent,
  ModernForecastType,
  WeatherEntity,
  getDefaultForecastType,
  getForecast,
  getSupportedForecastTypes,
  getWind,
  subscribeForecast,
  weatherIcons,
} from "../../../data/weather";
import { HomeAssistant } from "../../../types";

@customElement("more-info-weather")
class MoreInfoWeather extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: WeatherEntity;

  @state() private _forecastEvent?: ForecastEvent;

  @state() private _forecastType?: ModernForecastType;

  @state() private _subscribed?: Promise<() => void>;

  private _unsubscribeForecastEvents() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    this._forecastEvent = undefined;
  }

  private async _subscribeForecastEvents() {
    this._unsubscribeForecastEvents();
    if (
      !this.isConnected ||
      !this.hass ||
      !this.stateObj ||
      !this._forecastType
    ) {
      return;
    }

    this._subscribed = subscribeForecast(
      this.hass!,
      this.stateObj!.entity_id,
      this._forecastType,
      (event) => {
        this._forecastEvent = event;
      }
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeForecastEvents();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeForecastEvents();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("stateObj")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (
      !oldHass ||
      oldHass.locale !== this.hass.locale ||
      oldHass.config.unit_system !== this.hass.config.unit_system
    ) {
      return true;
    }

    return false;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if ((changedProps.has("stateObj") || !this._subscribed) && this.stateObj) {
      const oldState = changedProps.get("stateObj") as
        | WeatherEntity
        | undefined;
      if (
        oldState?.entity_id !== this.stateObj?.entity_id ||
        !this._subscribed
      ) {
        this._forecastType = getDefaultForecastType(this.stateObj);
        this._subscribeForecastEvents();
      }
    } else if (changedProps.has("_forecastType")) {
      this._subscribeForecastEvents();
    }
  }

  private _supportedForecasts = memoizeOne((stateObj: WeatherEntity) =>
    getSupportedForecastTypes(stateObj)
  );

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const supportedForecasts = this._supportedForecasts(this.stateObj);

    const forecastData = getForecast(
      this.stateObj.attributes,
      this._forecastEvent
    );
    const forecast = forecastData?.forecast;
    const hourly = forecastData?.type === "hourly";
    const dayNight = forecastData?.type === "twice_daily";

    return html`
      ${this._showValue(this.stateObj.attributes.temperature)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiThermometer}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.temperature")}
              </div>
              <div>
                ${this.hass.formatEntityAttributeValue(
                  this.stateObj,
                  "temperature"
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.pressure)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiGauge}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.air_pressure")}
              </div>
              <div>
                ${this.hass.formatEntityAttributeValue(
                  this.stateObj,
                  "pressure"
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.humidity)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiWaterPercent}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.humidity")}
              </div>
              <div>
                ${this.hass.formatEntityAttributeValue(
                  this.stateObj,
                  "humidity"
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.wind_speed)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiWeatherWindy}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.wind_speed")}
              </div>
              <div>
                ${getWind(
                  this.hass,
                  this.stateObj,
                  this.stateObj.attributes.wind_speed!,
                  this.stateObj.attributes.wind_bearing
                )}
              </div>
            </div>
          `
        : ""}
      ${this._showValue(this.stateObj.attributes.visibility)
        ? html`
            <div class="flex">
              <ha-svg-icon .path=${mdiEye}></ha-svg-icon>
              <div class="main">
                ${this.hass.localize("ui.card.weather.attributes.visibility")}
              </div>
              <div>
                ${this.hass.formatEntityAttributeValue(
                  this.stateObj,
                  "visibility"
                )}
              </div>
            </div>
          `
        : ""}
      ${forecast
        ? html`
            <div class="section">
              ${this.hass.localize("ui.card.weather.forecast")}:
            </div>
            ${supportedForecasts.length > 1
              ? html`<mwc-tab-bar
                  .activeIndex=${supportedForecasts.findIndex(
                    (item) => item === this._forecastType
                  )}
                  @MDCTabBar:activated=${this._handleForecastTypeChanged}
                >
                  ${supportedForecasts.map(
                    (forecastType) =>
                      html`<mwc-tab
                        .label=${this.hass!.localize(
                          `ui.card.weather.${forecastType}`
                        )}
                      ></mwc-tab>`
                  )}
                </mwc-tab-bar>`
              : nothing}
            ${forecast.map((item) =>
              this._showValue(item.templow) || this._showValue(item.temperature)
                ? html`<div class="flex">
                    ${item.condition
                      ? html`
                          <ha-svg-icon
                            .path=${weatherIcons[item.condition]}
                          ></ha-svg-icon>
                        `
                      : ""}
                    <div class="main">
                      ${dayNight
                        ? html`
                            ${formatDateWeekdayDay(
                              new Date(item.datetime),
                              this.hass!.locale,
                              this.hass!.config
                            )}
                            (${item.is_daytime !== false
                              ? this.hass!.localize("ui.card.weather.day")
                              : this.hass!.localize("ui.card.weather.night")})
                          `
                        : hourly
                        ? html`
                            ${formatTimeWeekday(
                              new Date(item.datetime),
                              this.hass!.locale,
                              this.hass!.config
                            )}
                          `
                        : html`
                            ${formatDateWeekdayDay(
                              new Date(item.datetime),
                              this.hass!.locale,
                              this.hass!.config
                            )}
                          `}
                    </div>
                    <div class="templow">
                      ${this._showValue(item.templow)
                        ? this.hass.formatEntityAttributeValue(
                            this.stateObj!,
                            "templow",
                            item.templow
                          )
                        : hourly
                        ? ""
                        : "—"}
                    </div>
                    <div class="temp">
                      ${this._showValue(item.temperature)
                        ? this.hass.formatEntityAttributeValue(
                            this.stateObj!,
                            "temperature",
                            item.temperature
                          )
                        : "—"}
                    </div>
                  </div>`
                : ""
            )}
          `
        : ""}
      ${this.stateObj.attributes.attribution
        ? html`
            <div class="attribution">
              ${this.stateObj.attributes.attribution}
            </div>
          `
        : ""}
    `;
  }

  private _handleForecastTypeChanged(ev: CustomEvent): void {
    this._forecastType = this._supportedForecasts(this.stateObj!)[
      ev.detail.index
    ];
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        color: var(--paper-item-icon-color);
        margin-left: 8px;
      }

      mwc-tab-bar {
        margin-bottom: 4px;
      }

      .section {
        margin: 16px 0 8px 0;
        font-size: 1.2em;
      }

      .flex {
        display: flex;
        height: 32px;
        align-items: center;
      }

      .main {
        flex: 1;
        margin-left: 24px;
      }

      .temp,
      .templow {
        min-width: 48px;
        text-align: right;
      }

      .templow {
        margin: 0 16px;
        color: var(--secondary-text-color);
      }

      .attribution {
        color: var(--secondary-text-color);
        text-align: center;
      }
    `;
  }

  private _showValue(item: number | string | undefined): boolean {
    return typeof item !== "undefined" && item !== null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-weather": MoreInfoWeather;
  }
}
