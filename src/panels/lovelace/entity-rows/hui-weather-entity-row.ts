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
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import "../../../components/entity/state-badge";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  getSecondaryWeatherAttribute,
  getWeatherUnit,
  weatherIcons,
  weatherImages,
} from "../../../data/weather";
import { HomeAssistant, WeatherEntity } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import "../components/hui-warning";
import { LovelaceRow } from "./types";

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
            ${UNAVAILABLE_STATES.includes(stateObj.state)
              ? computeStateDisplay(
                  this.hass.localize,
                  stateObj,
                  this.hass.language
                )
              : html`
                  ${stateObj.attributes.temperature}
                  ${getWeatherUnit(this.hass, "temperature")}
                `}
          </div>
          <div class="secondary">
            ${getSecondaryWeatherAttribute(this.hass!, stateObj)}
          </div>
        </div>
      </hui-generic-entity-row>
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
