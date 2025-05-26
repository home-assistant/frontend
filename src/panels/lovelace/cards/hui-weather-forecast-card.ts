import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { formatDateWeekdayShort } from "../../../common/datetime/format_date";
import { formatTime } from "../../../common/datetime/format_time";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { ForecastEvent, WeatherEntity } from "../../../data/weather";
import {
  getForecast,
  getSecondaryWeatherAttribute,
  getWeatherStateIcon,
  getWeatherUnit,
  getWind,
  subscribeForecast,
  weatherAttrIcons,
  weatherSVGStyles,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { WeatherForecastCardConfig } from "./types";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

@customElement("hui-weather-forecast-card")
class HuiWeatherForecastCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-weather-forecast-card-editor");
    return document.createElement("hui-weather-forecast-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): WeatherForecastCardConfig {
    const includeDomains = ["weather"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "weather-forecast", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherForecastCardConfig;

  @state() private _forecastEvent?: ForecastEvent;

  @state() private _subscribed?: Promise<() => void>;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => {
      const result = {
        width: "regular",
        height: "tall",
      };

      const width = entries[0]?.contentRect.width;
      if (width < 245) {
        result.height = "very-very-narrow";
      } else if (width < 300) {
        result.width = "very-narrow";
      } else if (width < 375) {
        result.width = "narrow";
      }

      const height = entries[0]?.contentRect.height;
      if (height < 235) {
        result.height = "short";
      }

      return result;
    },
  });

  private _needForecastSubscription() {
    return (
      this._config!.forecast_type && this._config!.forecast_type !== "legacy"
    );
  }

  private _unsubscribeForecastEvents() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private async _subscribeForecastEvents() {
    this._unsubscribeForecastEvents();
    if (
      !this.isConnected ||
      !this.hass ||
      !this._config ||
      !this._needForecastSubscription() ||
      !isComponentLoaded(this.hass, "weather") ||
      !this.hass.states[this._config!.entity]
    ) {
      return;
    }

    this._subscribed = subscribeForecast(
      this.hass!,
      this._config!.entity,
      this._config!.forecast_type as "daily" | "hourly" | "twice_daily",
      (event) => {
        this._forecastEvent = event;
      }
    ).catch((e) => {
      if (e.code === "invalid_entity_id") {
        setTimeout(() => {
          this._subscribed = undefined;
        }, 2000);
      }
      throw e;
    });
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this._config && this.hass) {
      this._subscribeForecastEvents();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeForecastEvents();
  }

  public getCardSize(): number {
    let cardSize = 1;
    if (this._config?.show_current !== false) {
      cardSize += 1;
    }
    if (this._config?.show_forecast !== false) {
      cardSize += 1;
    }
    if (this._config?.forecast_type === "daily") {
      cardSize += 1;
    }
    return cardSize;
  }

  public setConfig(config: WeatherForecastCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigOrEntityChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    if (changedProps.has("_config") || !this._subscribed) {
      this._subscribeForecastEvents();
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | WeatherForecastCardConfig
      | undefined;

    if (
      (changedProps.has("hass") && !oldHass) ||
      (changedProps.has("_config") && !oldConfig) ||
      (changedProps.has("hass") && oldHass!.themes !== this.hass.themes) ||
      (changedProps.has("_config") && oldConfig!.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity] as WeatherEntity;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    if (stateObj.state === UNAVAILABLE) {
      return html`
        <ha-card class="unavailable" @click=${this._handleAction}>
          ${this.hass.localize("ui.panel.lovelace.warning.entity_unavailable", {
            entity: `${computeStateName(stateObj)} (${this._config.entity})`,
          })}
        </ha-card>
      `;
    }

    const forecastData = getForecast(
      stateObj.attributes,
      this._forecastEvent,
      this._config?.forecast_type
    );

    let itemsToShow = this._config?.forecast_slots ?? 5;
    if (this._sizeController.value.width === "very-very-narrow") {
      itemsToShow = Math.min(3, itemsToShow);
    } else if (this._sizeController.value.width === "very-narrow") {
      itemsToShow = Math.min(5, itemsToShow);
    } else if (this._sizeController.value.width === "narrow") {
      itemsToShow = Math.min(7, itemsToShow);
    }

    const forecast =
      this._config?.show_forecast !== false && forecastData?.forecast?.length
        ? forecastData.forecast.slice(0, itemsToShow)
        : undefined;
    const weather = !forecast || this._config?.show_current !== false;

    const hourly = forecastData?.type === "hourly";
    const dayNight = forecastData?.type === "twice_daily";

    const weatherStateIcon = getWeatherStateIcon(stateObj.state, this);
    const name = this._config.name ?? computeStateName(stateObj);

    return html`
      <ha-card
        class=${classMap({
          [this._sizeController.value.height]: true,
          [this._sizeController.value.width]: true,
        })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      >
        ${weather
          ? html`
              <div class="content">
                <div class="icon-image">
                  ${weatherStateIcon ||
                  html`
                    <ha-state-icon
                      class="weather-icon"
                      .stateObj=${stateObj}
                      .hass=${this.hass}
                    ></ha-state-icon>
                  `}
                </div>
                <div class="info">
                  <div class="name-state">
                    <div class="state">
                      ${this.hass.formatEntityState(stateObj)}
                    </div>
                    <div class="name" .title=${name}>${name}</div>
                  </div>
                  <div class="temp-attribute">
                    <div class="temp">
                      ${stateObj.attributes.temperature !== undefined &&
                      stateObj.attributes.temperature !== null
                        ? html`
                            ${formatNumber(
                              stateObj.attributes.temperature,
                              this.hass.locale
                            )}&nbsp;<span
                              >${getWeatherUnit(
                                this.hass.config,
                                stateObj,
                                "temperature"
                              )}</span
                            >
                          `
                        : html`&nbsp;`}
                    </div>
                    <div class="attribute">
                      ${this._config.secondary_info_attribute !== undefined
                        ? html`
                            ${this._config.secondary_info_attribute in
                            weatherAttrIcons
                              ? html`
                                  <ha-svg-icon
                                    class="attr-icon"
                                    .path=${weatherAttrIcons[
                                      this._config.secondary_info_attribute
                                    ]}
                                  ></ha-svg-icon>
                                `
                              : this.hass!.localize(
                                  `ui.card.weather.attributes.${this._config.secondary_info_attribute}`
                                )}
                            ${this._config.secondary_info_attribute ===
                            "wind_speed"
                              ? getWind(
                                  this.hass,
                                  stateObj,
                                  stateObj.attributes.wind_speed,
                                  stateObj.attributes.wind_bearing
                                )
                              : html`
                                  ${this.hass.formatEntityAttributeValue(
                                    stateObj,
                                    this._config.secondary_info_attribute
                                  )}
                                `}
                          `
                        : getSecondaryWeatherAttribute(
                            this.hass,
                            stateObj,
                            forecast!
                          )}
                    </div>
                  </div>
                </div>
              </div>
            `
          : ""}
        ${forecast
          ? html`
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
                                      ? this.hass!.localize(
                                          "ui.card.weather.day"
                                        )
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
                            : ""}
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
                                ? ""
                                : "—"}
                          </div>
                        </div>
                      `
                    : ""
                )}
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _showValue(item?: any): boolean {
    return typeof item !== "undefined" && item !== null;
  }

  public getGridOptions(): LovelaceGridOptions {
    let rows = 1;
    let min_rows = 1;
    if (this._config?.show_current !== false) {
      rows += 1;
      min_rows += 1;
    }
    if (this._config?.show_forecast !== false) {
      rows += 1;
      min_rows += 1;
    }
    if (this._config?.forecast_type === "daily") {
      rows += 1;
    }
    return {
      columns: 12,
      rows: rows,
      min_columns: 6,
      min_rows: min_rows,
    };
  }

  static get styles(): CSSResultGroup {
    return [
      weatherSVGStyles,
      css`
        :host {
          position: relative;
          display: block;
          height: 100%;
        }
        ha-card {
          cursor: pointer;
          outline: none;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-sizing: border-box;
          padding: 16px 0;
        }

        .content {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px;
        }

        .content + .forecast {
          padding-top: 16px;
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

        .name,
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

        .name,
        .state {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attribute {
          white-space: nowrap;
          direction: ltr;
        }

        .forecast {
          display: flex;
          justify-content: space-around;
          padding: 0 16px;
        }

        .forecast > div {
          text-align: center;
        }

        .forecast .icon,
        .forecast .temp {
          margin: 0;
        }

        .forecast .temp {
          font-size: var(--ha-font-size-l);
        }

        .forecast-image-icon {
          padding-top: 6px;
          padding-bottom: 6px;
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

        .attr-icon {
          --mdc-icon-size: 20px;
        }

        .attribute,
        .templow,
        .daynight,
        .name {
          color: var(--secondary-text-color);
        }

        .unavailable {
          height: 100px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: var(--ha-font-size-l);
          padding: 10px 20px;
          text-align: center;
        }

        /* ============= NARROW ============= */

        [class*="narrow"] .icon-image {
          min-width: 52px;
        }

        [class*="narrow"] .weather-image {
          flex: 0 0 52px;
          width: 52px;
        }

        [class*="narrow"] .icon-image .weather-icon {
          --mdc-icon-size: 52px;
        }

        [class*="narrow"] .state,
        [class*="narrow"] .temp-attribute .temp {
          font-size: var(--ha-font-size-xl);
        }

        [class*="narrow"] .temp-attribute .temp {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }

        [class*="narrow"] .temp span {
          top: 1px;
          font-size: var(--ha-font-size-l);
        }

        /* ============= VERY NARROW ============= */

        [class*="very-narrow"] .name,
        [class*="very-narrow"] .attribute {
          display: none;
        }

        [class*="very-narrow"] .info {
          flex-direction: column;
          align-items: flex-start;
        }

        [class*="very-narrow"] .name-state {
          padding-right: 0;
          padding-inline-end: 0;
          padding-inline-start: initial;
        }

        /* ============= VERY VERY NARROW ============= */

        [class*="very-very-narrow"] .info {
          padding-top: 4px;
          align-items: center;
        }

        [class*="very-very-narrow"] .content {
          flex-wrap: wrap;
          justify-content: center;
          flex-direction: column;
        }

        [class*="very-very-narrow"] .icon-image {
          min-width: 48px;
        }

        [class*="very-very-narrow"] .icon-image > * {
          flex: 0 0 48px;
          height: 48px;
        }

        [class*="very-very-narrow"] .content + .forecast {
          padding-top: 8px;
        }

        [class*="very-very-narrow"] .icon-image {
          margin-right: 0;
          margin-inline-end: 0;
          margin-inline-start: initial;
        }

        /* ============= SHORT ============= */

        .short .state,
        .short .temp-attribute .temp {
          font-size: 24px;
          line-height: 1.25;
        }

        .short .content + .forecast {
          padding-top: 12px;
        }

        .short .icon-image {
          min-width: 48px;
        }

        .short .icon-image > * {
          flex: 0 0 48px;
          height: 48px;
        }

        .short .forecast-image-icon {
          padding-top: 4px;
          padding-bottom: 4px;
        }

        .short .forecast-image-icon > * {
          width: 32px;
          height: 32px;
          --mdc-icon-size: 32px;
        }

        .short .forecast-icon {
          --mdc-icon-size: 32px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card": HuiWeatherForecastCard;
  }
}
