import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { formatTime } from "../../../common/datetime/format_time";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { formatNumber } from "../../../common/number/format_number";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity";
import { ActionHandlerEvent } from "../../../data/lovelace";
import {
  getSecondaryWeatherAttribute,
  getWeatherStateIcon,
  getWeatherUnit,
  getWind,
  isForecastHourly,
  weatherAttrIcons,
  WeatherEntity,
  weatherSVGStyles,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { installResizeObserver } from "../common/install-resize-observer";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { WeatherForecastCardConfig } from "./types";

const DAY_IN_MILLISECONDS = 86400000;

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

  @property({ type: Boolean, reflect: true, attribute: "veryverynarrow" })
  private _veryVeryNarrow = false;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  public getCardSize(): number {
    let cardSize = 0;
    if (this._config?.show_current !== false) {
      cardSize += 2;
    }
    if (this._config?.show_forecast !== false) {
      cardSize += 3;
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
    return hasConfigOrEntityChanged(this, changedProps);
  }

  public willUpdate(): void {
    if (!this.hasUpdated) {
      this._measureCard();
    }
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    if (stateObj.state === UNAVAILABLE) {
      return html`
        <ha-card class="unavailable" @click=${this._handleAction}>
          ${this.hass.localize(
            "ui.panel.lovelace.warning.entity_unavailable",
            "entity",
            `${computeStateName(stateObj)} (${this._config.entity})`
          )}
        </ha-card>
      `;
    }

    const forecast =
      this._config?.show_forecast !== false &&
      stateObj.attributes.forecast?.length
        ? stateObj.attributes.forecast.slice(0, this._veryVeryNarrow ? 3 : 5)
        : undefined;
    const weather = !forecast || this._config?.show_current !== false;

    const hourly = isForecastHourly(forecast);
    let dayNight: boolean | undefined;

    if (hourly) {
      const dateFirst = new Date(forecast![0].datetime);
      const datelast = new Date(forecast![forecast!.length - 1].datetime);
      const dayDiff = datelast.getTime() - dateFirst.getTime();

      dayNight = dayDiff > DAY_IN_MILLISECONDS;
    }

    const weatherStateIcon = getWeatherStateIcon(stateObj.state, this);
    const name = this._config.name ?? computeStateName(stateObj);

    return html`
      <ha-card
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
                      .state=${stateObj}
                    ></ha-state-icon>
                  `}
                </div>
                <div class="info">
                  <div class="name-state">
                    <div class="state">
                      ${computeStateDisplay(
                        this.hass.localize,
                        stateObj,
                        this.hass.locale,
                        this.hass.entities
                      )}
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
                                this.hass,
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
                                  ${formatNumber(
                                    stateObj.attributes[
                                      this._config.secondary_info_attribute
                                    ],
                                    this.hass.locale
                                  )}
                                  ${getWeatherUnit(
                                    this.hass,
                                    stateObj,
                                    this._config.secondary_info_attribute
                                  )}
                                `}
                          `
                        : getSecondaryWeatherAttribute(this.hass, stateObj)}
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
                                  ${new Date(item.datetime).toLocaleDateString(
                                    this.hass!.language,
                                    { weekday: "short" }
                                  )}
                                  <div class="daynight">
                                    ${item.daytime === undefined || item.daytime
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
                                    this.hass!.locale
                                  )}
                                `
                              : html`
                                  ${new Date(item.datetime).toLocaleDateString(
                                    this.hass!.language,
                                    { weekday: "short" }
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
                                      item.daytime || item.daytime === undefined
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

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }
    this._resizeObserver.observe(card);
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }

    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }

    if (card.offsetWidth < 375) {
      this.setAttribute("narrow", "");
    } else {
      this.removeAttribute("narrow");
    }
    if (card.offsetWidth < 300) {
      this.setAttribute("verynarrow", "");
    } else {
      this.removeAttribute("verynarrow");
    }
    this._veryVeryNarrow = card.offsetWidth < 245;
  }

  private _showValue(item?: any): boolean {
    return typeof item !== "undefined" && item !== null;
  }

  static get styles(): CSSResultGroup {
    return [
      weatherSVGStyles,
      css`
        ha-card {
          cursor: pointer;
          outline: none;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .content {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
        }

        .icon-image {
          display: flex;
          align-items: center;
          min-width: 64px;
          margin-right: 16px;
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
          text-align: right;
        }

        .temp-attribute .temp {
          position: relative;
          margin-right: 24px;
        }

        .temp-attribute .temp span {
          position: absolute;
          font-size: 24px;
          top: 1px;
        }

        .state,
        .temp-attribute .temp {
          font-size: 28px;
          line-height: 1.2;
        }

        .name,
        .attribute {
          font-size: 14px;
          line-height: 1;
        }

        .name-state {
          overflow: hidden;
          padding-right: 12px;
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
        }

        .forecast {
          display: flex;
          justify-content: space-around;
          padding-top: 16px;
        }

        .forecast > div {
          text-align: center;
        }

        .forecast .icon,
        .forecast .temp {
          margin: 4px 0;
        }

        .forecast .temp {
          font-size: 16px;
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
          font-size: 16px;
          padding: 10px 20px;
          text-align: center;
        }

        /* ============= NARROW ============= */

        :host([narrow]) .icon-image {
          min-width: 52px;
        }

        :host([narrow]) .weather-image {
          flex: 0 0 52px;
          width: 52px;
        }

        :host([narrow]) .icon-image .weather-icon {
          --mdc-icon-size: 52px;
        }

        :host([narrow]) .state,
        :host([narrow]) .temp-attribute .temp {
          font-size: 22px;
        }

        :host([narrow]) .temp-attribute .temp {
          margin-right: 16px;
        }

        :host([narrow]) .temp span {
          top: 1px;
          font-size: 16px;
        }

        /* ============= VERY NARROW ============= */

        :host([veryNarrow]) .name,
        :host([veryNarrow]) .attribute {
          display: none;
        }

        :host([veryNarrow]) .info {
          flex-direction: column;
          align-items: flex-start;
        }

        :host([veryNarrow]) .name-state {
          padding-right: 0;
        }

        /* ============= VERY VERY NARROW ============= */

        :host([veryVeryNarrow]) .info {
          padding-top: 4px;
          align-items: center;
        }

        :host([veryVeryNarrow]) .content {
          flex-wrap: wrap;
          justify-content: center;
          flex-direction: column;
        }

        :host([veryVeryNarrow]) .icon-image {
          margin-right: 0;
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
