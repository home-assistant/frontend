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
import { ifDefined } from "lit-html/directives/if-defined";
import { classMap } from "lit-html/directives/class-map";

import "../../../components/entity/state-badge";
import "../components/hui-warning";

import { LovelaceRow } from "./types";
import { HomeAssistant, WeatherEntity } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { UNAVAILABLE } from "../../../data/entity";
import { weatherIcons, getWeatherUnit } from "../../../data/weather";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
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

    this._config = config;
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
      >
        <state-badge
          .hass=${this.hass}
          .stateObj=${stateObj}
          .overrideImage=${weatherIcons[stateObj.state]}
          tabindex=${ifDefined(pointer ? "0" : undefined)}
        ></state-badge>
        <div class="container">
          <div style="display: flex;">
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
          ${secondaryAttribute
            ? html`
                <div class="attributes">
                  <span>
                    ${secondaryAttribute}
                  </span>
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  private _getSecondaryAttribute(stateObj: WeatherEntity): string | undefined {
    const extrema = this._getExtrema(stateObj);

    if (extrema) {
      return extrema;
    }

    let value: number;
    let attribute: string;

    if (
      stateObj.attributes.forecast?.length &&
      stateObj.attributes.forecast[0].precipitation !== undefined &&
      stateObj.attributes.forecast[0].precipitation !== null
    ) {
      value = stateObj.attributes.forecast[0].precipitation!;
      attribute = "precipitation";
    } else if ("humidity" in stateObj.attributes) {
      value = stateObj.attributes.humidity!;
      attribute = "humidity";
    } else {
      return undefined;
    }

    return `
      ${this.hass!.localize(
        `ui.card.weather.attributes.${attribute}`
      )} ${value}${getWeatherUnit(this.hass!, attribute)}
    `;
  }

  private _getExtrema(stateObj: WeatherEntity): string | undefined {
    if (!stateObj.attributes.forecast?.length) {
      return undefined;
    }

    let tempLow: number | undefined;
    let tempHigh: number | undefined;
    const today = new Date().getDate();

    for (const forecast of stateObj.attributes.forecast!) {
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

    const unit = getWeatherUnit(this.hass!, "temperature");

    return `
      ${
        tempHigh
          ? `
              ${this.hass!.localize(`ui.card.weather.high`)} ${tempHigh}${unit}
            `
          : ""
      }
      ${tempLow && tempHigh ? " / " : ""}
      ${
        tempLow
          ? `
            ${this.hass!.localize(`ui.card.weather.low`)} ${tempLow}${unit}
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
        margin-right: 16px;
      }

      .temperature span {
        font-size: 18px;
        position: absolute;
      }

      .container {
        flex: 1 0;
        display: flex;
        flex-flow: column;
      }

      .info {
        display: flex;
        flex-flow: column;
        justify-content: center;
      }

      .info,
      .attributes {
        flex: 1 0;
        margin-left: 16px;
        overflow: hidden;
      }

      .info > *,
      .attributes > * {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .attributes {
        padding-top: 1px;
        color: var(--secondary-text-color);
      }

      .attributes > *:not(:first-child) {
        padding-left: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
