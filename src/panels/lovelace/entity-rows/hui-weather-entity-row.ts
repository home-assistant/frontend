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
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  getWeatherUnit,
  weatherIcons,
  weatherImages,
} from "../../../data/weather";
import { HomeAssistant, WeatherEntity } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { UNAVAILABLE } from "../../../data/entity";
import {
  weatherIcons,
  getWeatherUnit,
  weatherImages,
  getSecondaryWeatherAttribute,
} from "../../../data/weather";
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
              ? this.hass.localize(`state.default.${stateObj.state}`) ||
                stateObj.state
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
        padding: 10px 20px;
        text-align: center;
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
