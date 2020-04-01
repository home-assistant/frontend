import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../components/hui-warning";

import { WeatherForecastCardConfig } from "./types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant, WeatherEntity } from "../../../types";
import { findEntities } from "../common/find-entites";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { actionHandler } from "../common/directives/action-handler-directive";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { fireEvent } from "../../../common/dom/fire_event";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { debounce } from "../../../common/util/debounce";
import { UNAVAILABLE } from "../../../data/entity";
import {
  weatherIcons,
  getSecondaryWeatherAttribute,
  getWeatherUnit,
  weatherImages,
} from "../../../data/weather";

const DAY = 86400000;

@customElement("hui-weather-forecast-card")
class HuiWeatherForecastCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-weather-forecast-card-editor" */ "../editor/config-elements/hui-weather-forecast-card-editor"
    );
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

  @property() public hass?: HomeAssistant;
  @property() private _config?: WeatherForecastCardConfig;
  @property({ type: Boolean, reflect: true, attribute: "narrow" })
  private _narrow: boolean = false;
  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._measureCard());
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: WeatherForecastCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid card configuration");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = config;
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
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as WeatherEntity;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    if (stateObj.state === UNAVAILABLE || 1) {
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

    const forecast = stateObj.attributes.forecast?.length
      ? stateObj.attributes.forecast.slice(0, this._narrow ? 3 : 5)
      : undefined;

    let hourly: boolean | undefined;

    if (forecast) {
      const date1 = new Date(forecast[0].datetime);
      const date2 = new Date(forecast[1].datetime);
      const timeDiff = date2.getTime() - date1.getTime();

      hourly = timeDiff < DAY;
    }

    return html`
      <ha-card
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
        tabindex="0"
      >
        <div class="main">
          <div class="icon-header">
            ${stateObj.state in weatherIcons || stateObj.state in weatherImages
              ? html`
                  <state-badge
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                    .overrideImage=${weatherImages[stateObj.state]}
                    .overrideIcon=${weatherIcons[stateObj.state]}
                  ></state-badge>
                `
              : ""}
            <div class="header">
              <div class="name">
                ${this._config.name || computeStateName(stateObj)}
              </div>
              ${this.hass.localize(`state.weather.${stateObj.state}`) ||
                stateObj.state}
            </div>
          </div>
          <div class="temp-attribute">
            <div class="temp">
              ${stateObj.attributes.temperature}<span
                >${getWeatherUnit(this.hass, "temperature")}</span
              >
            </div>
            <div class="attribute">
              ${getSecondaryWeatherAttribute(this.hass, stateObj)}
            </div>
          </div>
        </div>
        ${this._config.show_forecast !== false && forecast
          ? html`
              <div class="forecast">
                ${forecast.map(
                  (item) => html`
                    <div>
                      <div>
                        ${hourly
                          ? html`
                              ${new Date(item.datetime).toLocaleTimeString(
                                this.hass!.language,
                                {
                                  hour: "numeric",
                                }
                              )}
                            `
                          : html`
                              ${new Date(item.datetime).toLocaleDateString(
                                this.hass!.language,
                                { weekday: "short" }
                              )}
                            `}
                      </div>
                      ${item.condition !== undefined && item.condition !== null
                        ? html`
                            <div class="icon">
                              <state-badge
                                .hass=${this.hass}
                                .stateObj=${stateObj}
                                .overrideImage=${weatherImages[item.condition!]}
                                .overrideIcon=${weatherIcons[item.condition!]}
                              ></state-badge>
                            </div>
                          `
                        : ""}
                      ${item.temperature !== undefined &&
                      item.temperature !== null
                        ? html`
                            <div class="temp">
                              ${item.temperature}°
                            </div>
                          `
                        : ""}
                      ${item.templow !== undefined && item.templow !== null
                        ? html`
                            <div class="templow">
                              ${item.templow || 44}°
                            </div>
                          `
                        : ""}
                    </div>
                  `
                )}
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  private _handleAction(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      import("resize-observer").then((modules) => {
        modules.install();
        this._attachObserver();
      });
      return;
    }

    this._resizeObserver = new ResizeObserver(
      debounce(() => this._measureCard(), 250, false)
    );

    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }
    this._resizeObserver.observe(card);
  }

  private _measureCard() {
    const card = this.shadowRoot!.querySelector("ha-card");
    if (!card) {
      return;
    }
    this._narrow = card.offsetWidth < 375;
    if (card.offsetWidth < 300) {
      this.setAttribute("verynarrow", "");
    } else {
      this.removeAttribute("verynarrow");
    }
    if (card.offsetWidth < 200) {
      this.setAttribute("veryverynarrow", "");
    } else {
      this.removeAttribute("veryverynarrow");
    }
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        cursor: pointer;
      }

      state-badge {
        color: var(--state-icon-color);
      }

      .main {
        padding: 16px;
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
      }

      .icon-header {
        display: flex;
        align-items: center;
        overflow: hidden;
        min-width: 0;
        flex: 1;
      }

      .icon-header state-badge {
        height: 72px;
        width: 72px;
        --iron-icon-width: 72px;
        --iron-icon-height: 72px;
        flex: 0 0 72px;
        margin-right: 16px;
      }

      .header {
        font-size: 28px;
        line-height: 28px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .name {
        font-size: 16px;
        color: var(--secondary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .temp-attribute {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .temp-attribute .temp {
        position: relative;
        font-size: 52px;
        line-height: 52px;
        margin-right: 24px;
      }

      .temp-attribute .temp span {
        position: absolute;
        font-size: 24px;
        line-height: 24px;
        top: 4px;
      }

      .forecast {
        display: flex;
        justify-content: space-between;
        padding: 0 16px 16px;
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

      .attribute,
      .templow {
        color: var(--secondary-text-color);
      }

      :host([narrow]) .forecast {
        justify-content: space-around;
      }

      :host([narrow]) .header {
        font-size: 22px;
        line-height: 22px;
      }

      :host([narrow]) .icon-header state-badge {
        height: 62px;
        width: 62px;
        --iron-icon-width: 62px;
        --iron-icon-height: 62px;
        flex: 0 0 62px;
      }

      :host([narrow]) .temp-attribute .temp {
        font-size: 44px;
        line-height: 44px;
        margin-right: 24px;
      }

      :host([narrow]) .temp-attribute .temp span {
        font-size: 24px;
        line-height: 24px;
        top: 3px;
      }

      :host([narrow]) .attribute {
        display: none;
      }

      :host([veryNarrow]) .header {
        display: none;
      }

      :host([veryNarrow]) .icon-header state-badge {
        height: 52px;
        width: 52px;
        --iron-icon-width: 52px;
        --iron-icon-height: 52px;
        flex: 0 0 52px;
      }

      :host([veryNarrow]) .temp-attribute .temp {
        font-size: 36px;
        line-height: 36px;
        margin-right: 18px;
      }

      :host([veryNarrow]) .temp-attribute .temp span {
        font-size: 18px;
        line-height: 18px;
        top: 3px;
      }

      :host([veryVeryNarrow]) .main {
        flex-wrap: wrap;
        justify-content: center;
      }

      :host([veryVeryNarrow]) .temp-attribute {
        padding-top: 4px;
      }

      .unavailable {
        height: 100px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card": HuiWeatherForecastCard;
  }
}
