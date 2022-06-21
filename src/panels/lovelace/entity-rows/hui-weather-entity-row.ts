import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/entity/state-badge";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { ActionHandlerEvent } from "../../../data/lovelace";
import {
  getSecondaryWeatherAttribute,
  getWeatherStateIcon,
  getWeatherUnit,
  WeatherEntity,
  weatherSVGStyles,
} from "../../../data/weather";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceRow } from "./types";

@customElement("hui-weather-entity-row")
class HuiWeatherEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config?.entity) {
      throw new Error("Entity must be specified");
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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const pointer = !(
      this._config.tap_action && this._config.tap_action.action !== "none"
    );

    const weatherStateIcon = getWeatherStateIcon(stateObj.state, this);

    return html`
      <div
        class="icon-image ${classMap({
          pointer,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      >
        ${weatherStateIcon ||
        html`
          <ha-state-icon
            class="weather-icon"
            .state=${stateObj}
          ></ha-state-icon>
        `}
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
        ${this._config.name || computeStateName(stateObj)}
      </div>
      <div
        class="attributes ${classMap({
          pointer,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      >
        <div>
          ${UNAVAILABLE_STATES.includes(stateObj.state) ||
          stateObj.attributes.temperature === undefined ||
          stateObj.attributes.temperature === null
            ? computeStateDisplay(
                this.hass.localize,
                stateObj,
                this.hass.locale
              )
            : html`
                ${formatNumber(
                  stateObj.attributes.temperature,
                  this.hass.locale
                )}
                ${getWeatherUnit(this.hass, stateObj, "temperature")}
              `}
        </div>
        <div class="secondary">
          ${getSecondaryWeatherAttribute(this.hass!, stateObj)}
        </div>
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return [
      weatherSVGStyles,
      css`
        :host {
          display: flex;
          align-items: center;
          flex-direction: row;
        }

        .info {
          margin-left: 16px;
          flex: 1 0 60px;
        }

        .info,
        .info > * {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .icon-image {
          display: flex;
          align-items: center;
          min-width: 40px;
        }

        .icon-image > * {
          flex: 0 0 40px;
          height: 40px;
        }

        .icon-image:focus {
          outline: none;
          background-color: var(--divider-color);
          border-radius: 50%;
        }

        .weather-icon {
          --mdc-icon-size: 40px;
        }

        :host([rtl]) .flex {
          margin-left: 0;
          margin-right: 16px;
        }

        .pointer {
          cursor: pointer;
        }

        .attributes {
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: right;
          margin-left: 8px;
        }

        .secondary {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
