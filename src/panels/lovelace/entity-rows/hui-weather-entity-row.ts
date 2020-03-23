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

import "../components/hui-generic-entity-row";
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

    return html`
      <state-badge
        class=${classMap({
          pointer,
        })}
        .hass=${this.hass}
        .stateObj=${stateObj}
        .overrideIcon=${weatherIcons["clear-night"]}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      ></state-badge>
      <div>
        ${stateObj.attributes.temperature}
        ${getWeatherUnit(this.hass, "temperature")}
      </div>
      <div
        class="info ${classMap({
          pointer,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      >
        <div>
          ${this._config.name || computeStateName(stateObj)}
        </div>
        <div class="secondary">
          ${this.hass.localize(`state.weather.${stateObj.state}`) ||
            stateObj.state}
        </div>
      </div>
      <div class="attributes pointer">
        <div>
          ${this._getExtrema(stateObj)}
        </div>
        <div>
          ${this._getSecondaryAttribute(stateObj)}
        </div>
      </div>
    `;
  }

  private _getSecondaryAttribute(stateObj: WeatherEntity): TemplateResult {
    if (!stateObj.attributes.forecast?.length) {
      return html``;
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
      return html``;
    }

    if (attribute === "wind_bearing") {
      const cardinalDirection = getWindBearing(value);
      return html`
        ${this.hass!.localize(
          `ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`
        ) || cardinalDirection}
      `;
    }

    return html`
      ${value} ${getWeatherUnit(this.hass!, attribute)}
    `;
  }

  private _getExtrema(stateObj: WeatherEntity): TemplateResult {
    if (!stateObj.attributes.forecast?.length) {
      return html``;
    }

    let tempLow: number | undefined;
    let tempHigh = stateObj.attributes.temperature;
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

    return html`
      ${tempLow
        ? html`
            ${tempLow} ${unit}
          `
        : ""}
      ${tempLow && tempHigh ? " / " : ""}
      ${tempHigh
        ? html`
            ${tempHigh} ${unit}
          `
        : ""}
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }

      .pointer {
        cursor: pointer;
      }

      .info {
        flex: 1 0 60px;
        margin-left: 16px;
        display: flex;
        flex-flow: column;
        justify-content: space-between;
        min-height: 40px;
        padding: 4px 0px;
      }

      .info,
      .info > * {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .attributes {
        margin-left: 16px;
        display: flex;
        flex-flow: column;
        justify-content: space-between;
        min-height: 40px;
        padding: 4px 0px;
        align-items: flex-end;
      }

      .attributes,
      .attributes > * {
        white-space: nowrap;
        overflow: hidden;
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
