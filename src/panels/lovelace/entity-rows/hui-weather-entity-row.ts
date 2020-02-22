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

import { LovelaceRow, WeatherRowConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { classMap } from "lit-html/directives/class-map";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ifDefined } from "lit-html/directives/if-defined";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { handleAction } from "../common/handle-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { weatherIcons, cardinalDirections } from "../../../data/weather";

@customElement("hui-weather-entity-row")
class HuiWeatherEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: WeatherRowConfig;

  public setConfig(config: WeatherRowConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = {
      primary_attribute: "extrema",
      secondary_attribute: "humidity",
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

    const stateObj = this.hass.states[this._config.entity];

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
        .overrideIcon=${weatherIcons[stateObj.state]}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      ></state-badge>
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
          ${stateObj.attributes.temperature} ${this._getUnit("temperature")}
          ${this._config.name || computeStateName(stateObj)}
        </div>
        <div class="secondary">
          ${this.hass.localize(`state.weather.${stateObj.state}`) ||
            stateObj.state}
        </div>
      </div>
      <div class="info flex-end">
        <div>
          ${this._getAttribute(stateObj, this._config.primary_attribute!)}
        </div>
        <div>
          ${this._getAttribute(stateObj, this._config.secondary_attribute!)}
        </div>
      </div>
    `;
  }

  private _getAttribute(stateObj: any, attribute: string): TemplateResult {
    const todayForecast = stateObj.attributes.forecast[0];

    if (attribute === "extrema") {
      return this._getExtrema(todayForecast);
    }

    const value = todayForecast[attribute]
      ? todayForecast[attribute]
      : stateObj.attributes[attribute];

    if (!value) {
      return html``;
    }

    if (attribute === "wind_bearing") {
      return this._getWindBearing(value);
    }

    return html`
      ${value} ${this._getUnit(attribute)}
    `;
  }

  private _getExtrema(todayForecast): TemplateResult {
    const low = todayForecast.templow;
    const high = todayForecast.temperature;
    const unit = this._getUnit("temperature");

    return html`
      ${low
        ? html`
            ${low} ${unit}
          `
        : ""}
      ${low && high ? " / " : ""}
      ${high
        ? html`
            ${high} ${unit}
          `
        : ""}
    `;
  }

  private _windBearingToText(degree: string): string {
    const degreenum = parseInt(degree, 10);
    if (isFinite(degreenum)) {
      // tslint:disable-next-line: no-bitwise
      return cardinalDirections[(((degreenum + 11.25) / 22.5) | 0) % 16];
    }
    return degree;
  }

  private _getWindBearing(bearing: string): TemplateResult {
    if (bearing != null) {
      const cardinalDirection = this._windBearingToText(bearing);
      return html`
        (${this.hass!.localize(
          `ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`
        ) || cardinalDirection})
      `;
    }
    return html``;
  }

  private _getUnit(measure: string): string {
    const lengthUnit = this.hass!.config.unit_system.length || "";
    switch (measure) {
      case "pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "wind_speed":
        return `${lengthUnit}/h`;
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      case "humidity":
      case "precipitation_probability":
        return "%";
      default:
        return this.hass!.config.unit_system[measure] || "";
    }
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

      .secondary {
        color: var(--secondary-text-color);
      }

      state-badge {
        flex: 0 0 40px;
      }

      state-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }

      .flex-end {
        align-items: flex-end;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
