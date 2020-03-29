import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "../../../components/entity/state-badge";
import "../components/hui-warning";

import { LovelaceRow } from "./types";
import { HomeAssistant, WeatherEntity } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { UNAVAILABLE } from "../../../data/entity";
import {
  weatherIcons,
  getWindBearing,
  getWeatherUnit,
} from "../../../data/weather";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { classMap } from "lit-html/directives/class-map";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ifDefined } from "lit-html/directives/if-defined";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-weather-entity-row")
class HuiWeatherEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config?.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = {
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as WeatherEntity;

    if (!stateObj || stateObj.state === UNAVAILABLE) {
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

    const pointer =
      (this._config.tap_action && this._config.tap_action.action !== "none") ||
      (this._config.entity &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity)));

    const secondaryAttribute = this._getSecondaryAttribute(stateObj);
    const extrema = this._getExtrema(stateObj);

    return html`
      <div
        class="main ${classMap({
          pointer,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      >
        <state-badge
          .hass=${this.hass}
          .stateObj=${stateObj}
          .overrideImage=${weatherIcons[stateObj.state]}
        ></state-badge>
        <div class="info">
          <div class="name">
            ${this._config.name || computeStateName(stateObj)}
          </div>
          <div class="state">
            ${this.hass.localize(`state.weather.${stateObj.state}`) ||
              stateObj.state}
          </div>
        </div>
        <div class="temperature">
          ${stateObj.attributes.temperature}<span
            >${getWeatherUnit(this.hass, "temperature")}</span
          >
        </div>
      </div>
      <div class="attributes">
        ${secondaryAttribute
          ? html`
              <div>
                ${secondaryAttribute}
              </div>
            `
          : ""}
        ${secondaryAttribute && extrema
          ? html`
              <div>|</div>
            `
          : ""}
        ${extrema
          ? html`
              <div>
                ${extrema}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _getSecondaryAttribute(stateObj: WeatherEntity): string | undefined {
    if (!stateObj.attributes.forecast?.length) {
      return undefined;
    }

    const forecastNow = stateObj.attributes.forecast[0];

    let value: string;
    let attribute: string;

    if (forecastNow.precipitation) {
      value = forecastNow.precipitation.toString();
      attribute = "precipitation";
    } else if (forecastNow.humidity) {
      value = forecastNow.humidity.toString();
      attribute = "humidity";
    } else {
      return undefined;
    }

    if (attribute === "wind_bearing") {
      const cardinalDirection = getWindBearing(value);
      return `
        ${this.hass!.localize(
          `ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`
        ) || cardinalDirection}
      `;
    }

    return `
      ${this.hass!.localize(
        `ui.card.weather.attributes.${attribute}`
      )}: ${value}${getWeatherUnit(this.hass!, attribute)}
    `;
  }

  private _getExtrema(stateObj: WeatherEntity): string | undefined {
    if (!stateObj.attributes.forecast?.length) {
      return undefined;
    }

    let tempLow: number | undefined;
    let tempHigh: number | undefined;
    const today = new Date().getDate();
    const unit = getWeatherUnit(this.hass!, "temperature");

    for (const forecast of stateObj.attributes.forecast) {
      if (new Date(forecast.datetime).getDate() !== today) {
        break;
      }
      if (!tempHigh || forecast.temperature > tempHigh) {
        tempHigh = forecast.temperature;
      }
      if (!tempLow || (forecast.templow && forecast.templow < tempLow)) {
        tempLow = forecast.templow;
      }
      if (!forecast.templow && (!tempLow || forecast.temperature < tempLow)) {
        tempLow = forecast.temperature;
      }
    }

    if (!tempLow && !tempHigh) {
      return undefined;
    }

    return `
      ${
        tempLow
          ? `
            ${this.hass!.localize(`ui.card.weather.low`)}
          `
          : ""
      }
      ${tempLow && tempHigh ? " / " : tempHigh ? "" : ":"}
      ${
        tempHigh
          ? `
              ${this.hass!.localize(`ui.card.weather.high`)}:
            `
          : ""
      }
      ${
        tempLow
          ? `
              ${tempLow}${unit}
            `
          : ""
      }
      ${tempLow && tempHigh ? " / " : ""}
      ${
        tempHigh
          ? `
              ${tempHigh}${unit}
            `
          : ""
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResult {
    return css`
      .pointer {
        cursor: pointer;
      }

      .main {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
      }

      .name {
        font-weight: 500;
      }

      .state {
        color: var(--secondary-text-color);
      }

      .temperature {
        font-size: 28px;
        margin-left: 16px;
        margin-right: 16px;
        line-height: 40px;
        position: relative;
      }

      .temperature span {
        font-size: 18px;
        line-height: 1em;
        position: absolute;
        top: 8px;
      }

      .info {
        flex: 1 0;
        display: flex;
        flex-flow: column;
        justify-content: center;
        margin-left: 16px;
        min-height: 40px;
        overflow: hidden;
      }

      .info > * {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .attributes {
        display: flex;
        justify-content: flex-end;
        color: var(--secondary-text-color);
        margin-left: 48px;
      }

      .attributes > * {
        padding-left: 8px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
