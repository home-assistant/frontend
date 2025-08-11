import { mdiEye, mdiGauge, mdiWaterPercent, mdiWeatherWindy } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDateWeekdayShort } from "../../../common/datetime/format_date";
import { formatTime } from "../../../common/datetime/format_time";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-relative-time";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/sl-tab-group";
import type {
  ForecastEvent,
  ModernForecastType,
  WeatherEntity,
} from "../../../data/weather";
import {
  getDefaultForecastType,
  getForecast,
  getSecondaryWeatherAttribute,
  getSupportedForecastTypes,
  getWeatherStateIcon,
  getWeatherUnit,
  getWind,
  subscribeForecast,
  weatherSVGStyles,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import { DragScrollController } from "../../../common/controllers/drag-scroll-controller";

@customElement("more-info-weather")
class MoreInfoWeather extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: WeatherEntity;

  @state() private _forecastEvent?: ForecastEvent;

  @state() private _forecastType?: ModernForecastType;

  @state() private _subscribed?: Promise<() => void>;

  // @ts-ignore
  private _dragScrollController = new DragScrollController(this, {
    selector: ".forecast",
  });

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

    const weatherStateIcon = getWeatherStateIcon(this.stateObj.state, this);

    return html`
      <div class="content">
        <div class="icon-image">
          ${weatherStateIcon ||
          html`
            <ha-state-icon
              class="weather-icon"
              .stateObj=${this.stateObj}
              .hass=${this.hass}
            ></ha-state-icon>
          `}
        </div>
        <div class="info">
          <div class="name-state">
            <div class="state">
              ${this.hass.formatEntityState(this.stateObj)}
            </div>
            <div class="time-ago">
              <ha-relative-time
                id="relative-time"
                .hass=${this.hass}
                .datetime=${this.stateObj.last_changed}
                capitalize
              ></ha-relative-time>
              <ha-tooltip for="relative-time">
                <div class="row">
                  <span class="column-name">
                    ${this.hass.localize(
                      "ui.dialogs.more_info_control.last_changed"
                    )}:
                  </span>
                  <ha-relative-time
                    .hass=${this.hass}
                    .datetime=${this.stateObj.last_changed}
                    capitalize
                  ></ha-relative-time>
                </div>
                <div class="row">
                  <span>
                    ${this.hass.localize(
                      "ui.dialogs.more_info_control.last_updated"
                    )}:
                  </span>
                  <ha-relative-time
                    .hass=${this.hass}
                    .datetime=${this.stateObj.last_updated}
                    capitalize
                  ></ha-relative-time>
                </div>
              </ha-tooltip>
            </div>
          </div>
          <div class="temp-attribute">
            <div class="temp">
              ${this.stateObj.attributes.temperature !== undefined &&
              this.stateObj.attributes.temperature !== null
                ? html`
                    ${formatNumber(
                      this.stateObj.attributes.temperature,
                      this.hass.locale
                    )}&nbsp;<span
                      >${getWeatherUnit(
                        this.hass.config,
                        this.stateObj,
                        "temperature"
                      )}</span
                    >
                  `
                : nothing}
            </div>
            <div class="attribute">
              ${getSecondaryWeatherAttribute(
                this.hass,
                this.stateObj,
                forecast!
              )}
            </div>
          </div>
        </div>
      </div>
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
        : nothing}
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
        : nothing}
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
        : nothing}
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
        : nothing}
      ${forecast
        ? html`
            <div class="section">
              ${this.hass.localize("ui.card.weather.forecast")}:
            </div>
            ${supportedForecasts.length > 1
              ? html`<sl-tab-group
                  @sl-tab-show=${this._handleForecastTypeChanged}
                >
                  ${supportedForecasts.map(
                    (forecastType) =>
                      html`<sl-tab
                        slot="nav"
                        .panel=${forecastType}
                        .active=${this._forecastType === forecastType}
                      >
                        ${this.hass!.localize(
                          `ui.card.weather.${forecastType}`
                        )}
                      </sl-tab>`
                  )}
                </sl-tab-group>`
              : nothing}
            <div class="forecast">
              ${forecast.map((item) =>
                this._showValue(item.templow) ||
                this._showValue(item.temperature)
                  ? html`
                      <div>
                        <div>
                          ${dayNight
                            ? html`
                                ${formatDateWeekdayShort(
                                  new Date(item.datetime),
                                  this.hass!.locale,
                                  this.hass!.config
                                )}
                                <div class="daynight">
                                  ${item.is_daytime !== false
                                    ? this.hass!.localize("ui.card.weather.day")
                                    : this.hass!.localize(
                                        "ui.card.weather.night"
                                      )}<br />
                                </div>
                              `
                            : hourly
                              ? html`
                                  ${formatTime(
                                    new Date(item.datetime),
                                    this.hass!.locale,
                                    this.hass!.config
                                  )}
                                `
                              : html`
                                  ${formatDateWeekdayShort(
                                    new Date(item.datetime),
                                    this.hass!.locale,
                                    this.hass!.config
                                  )}
                                `}
                        </div>
                        ${this._showValue(item.condition)
                          ? html`
                              <div class="forecast-image-icon">
                                ${getWeatherStateIcon(
                                  item.condition!,
                                  this,
                                  !(
                                    item.is_daytime ||
                                    item.is_daytime === undefined
                                  )
                                )}
                              </div>
                            `
                          : nothing}
                        <div class="temp">
                          ${this._showValue(item.temperature)
                            ? html`${formatNumber(
                                item.temperature,
                                this.hass!.locale
                              )}°`
                            : "—"}
                        </div>
                        <div class="templow">
                          ${this._showValue(item.templow)
                            ? html`${formatNumber(
                                item.templow!,
                                this.hass!.locale
                              )}°`
                            : hourly
                              ? nothing
                              : "—"}
                        </div>
                      </div>
                    `
                  : nothing
              )}
            </div>
          `
        : nothing}
      ${this.stateObj.attributes.attribution
        ? html`
            <div class="attribution">
              ${this.stateObj.attributes.attribution}
            </div>
          `
        : nothing}
    `;
  }

  private _handleForecastTypeChanged(ev: CustomEvent): void {
    this._forecastType = ev.detail.name;
  }

  static get styles(): CSSResultGroup {
    return [
      weatherSVGStyles,
      css`
        ha-svg-icon {
          color: var(--state-icon-color);
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }

        .section {
          margin: 16px 0 8px 0;
          font-size: 1.2em;
        }

        sl-tab {
          flex: 1;
        }

        sl-tab::part(base) {
          width: 100%;
          justify-content: center;
        }

        .flex {
          display: flex;
          height: 32px;
          align-items: center;
        }
        .flex > div:last-child {
          direction: ltr;
        }

        .main {
          flex: 1;
          margin-left: 24px;
          margin-inline-start: 24px;
          margin-inline-end: initial;
        }

        .attribution {
          text-align: center;
          margin-top: 16px;
        }

        .time-ago,
        .attribute {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .attribution,
        .templow,
        .daynight,
        .attribute,
        .time-ago {
          color: var(--secondary-text-color);
        }

        .content {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .icon-image {
          display: flex;
          align-items: center;
          min-width: 64px;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }

        .icon-image > * {
          flex: 0 0 64px;
          height: 64px;
        }

        .weather-icon {
          --mdc-icon-size: 64px;
        }

        .info {
          display: flex;
          justify-content: space-between;
          flex-grow: 1;
          overflow: hidden;
        }

        .temp-attribute {
          text-align: var(--float-end);
        }

        .temp-attribute .temp {
          position: relative;
          margin-right: 24px;
          direction: ltr;
        }

        .temp-attribute .temp span {
          position: absolute;
          font-size: var(--ha-font-size-2xl);
          top: 1px;
        }

        .state,
        .temp-attribute .temp {
          font-size: var(--ha-font-size-3xl);
          line-height: var(--ha-line-height-condensed);
        }

        .attribute {
          font-size: var(--ha-font-size-m);
          line-height: 1;
        }

        .name-state {
          overflow: hidden;
          padding-right: 12px;
          padding-inline-end: 12px;
          padding-inline-start: initial;
          width: 100%;
        }

        .state {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .forecast {
          display: flex;
          justify-content: space-around;
          padding: 16px;
          padding-bottom: 0px;
          overflow-x: auto;
          scrollbar-color: var(--scrollbar-thumb-color) transparent;
          scrollbar-width: thin;
          mask-image: linear-gradient(
            90deg,
            transparent 0%,
            black 5%,
            black 94%,
            transparent 100%
          );
          user-select: none;
        }

        .forecast > div {
          text-align: center;
          padding: 0 10px;
        }

        .forecast .icon,
        .forecast .temp {
          margin: 4px 0;
        }

        .forecast .temp {
          font-size: var(--ha-font-size-l);
        }

        .forecast-image-icon {
          padding-top: 4px;
          padding-bottom: 4px;
          display: flex;
          justify-content: center;
        }

        .forecast-image-icon > * {
          width: 40px;
          height: 40px;
          --mdc-icon-size: 40px;
        }

        .forecast-icon {
          --mdc-icon-size: 40px;
        }
      `,
    ];
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
