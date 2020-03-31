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
import {
  weatherIcons,
  getWeatherUnit,
  weatherImages,
} from "../../../data/weather";

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

    const weatherRowConfig = {
      ...this._config,
      icon: weatherIcons[stateObj.state],
      image: weatherImages[stateObj.state],
    };

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${weatherRowConfig}>
        <div class="attributes">
          <div>
            ${stateObj.attributes.temperature}
            ${getWeatherUnit(this.hass, "temperature")}
          </div>
          <div class="secondary">
            ${this._getSecondaryAttribute(stateObj)}
          </div>
        </div>
      </hui-generic-entity-row>
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

  static get styles(): CSSResult {
    return css`
      .attributes {
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: right;
      }

      .secondary {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
