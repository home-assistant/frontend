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
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { UNAVAILABLE } from "../../../data/entity";
import {
  weatherIcons,
  getWindBearing,
  getWeatherUnit,
} from "../../../data/weather";

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

    const stateObj = this.hass.states[this._config.entity];

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

    const weatherConfig = {
      icon: weatherIcons[stateObj.state],
      ...this._config,
    };

    return html`
      <hui-generic-entity-row
        .hass="${this.hass}"
        .config="${weatherConfig}"
        .showSecondary=${false}
      >
        <div class="attributes">
          <div>
            ${this._getExtrema(stateObj.attributes.forecast[0])}
          </div>
          <div>
            ${this._getSecondaryAttribute(stateObj)}
          </div>
        </div>
        <div slot="secondary">
          ${stateObj.attributes.temperature}
          ${getWeatherUnit(this.hass, "temperature")}
          ${this.hass.localize(`state.weather.${stateObj.state}`) ||
            stateObj.state}
        </div>
      </hui-generic-entity-row>
    `;
  }

  private _getSecondaryAttribute(stateObj: any): TemplateResult {
    const todayForecast = stateObj.attributes.forecast[0];

    let value: string;
    let attribute: string;

    if (todayForecast.precipitation) {
      value = todayForecast.precipitation;
      attribute = "precipitation";
    } else if (todayForecast.humidity) {
      value = todayForecast.humidity;
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

  private _getExtrema(todayForecast: any): TemplateResult {
    const low = todayForecast.templow;
    const high = todayForecast.temperature;
    const unit = getWeatherUnit(this.hass!, "temperature");

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

  static get styles(): CSSResult {
    return css`
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
