import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/entity/state-badge";
import { isUnavailableState } from "../../../data/entity";
import { ActionHandlerEvent } from "../../../data/lovelace";
import {
  getForecast,
  getSecondaryWeatherAttribute,
  getWeatherStateIcon,
  getWeatherUnit,
  subscribeForecast,
  ForecastEvent,
  WeatherEntity,
  WeatherEntityFeature,
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
import { supportsFeature } from "../../../common/entity/supports-feature";

@customElement("hui-weather-entity-row")
class HuiWeatherEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  @state() private _forecastEvent?: ForecastEvent;

  @state() private _subscribed?: Promise<() => void>;

  private _needForecastSubscription() {
    const stateObj = this.hass!.states[this._config!.entity];
    return (
      stateObj &&
      supportsFeature(
        stateObj,
        // eslint-disable-next-line no-bitwise
        WeatherEntityFeature.FORECAST_DAILY |
          // eslint-disable-next-line no-bitwise
          WeatherEntityFeature.FORECAST_HOURLY |
          WeatherEntityFeature.FORECAST_TWICE_DAILY
      )
    );
  }

  private _forecastType(stateObj: HassEntity) {
    if (supportsFeature(stateObj, WeatherEntityFeature.FORECAST_DAILY)) {
      return "daily";
    }
    if (supportsFeature(stateObj, WeatherEntityFeature.FORECAST_HOURLY)) {
      return "hourly";
    }
    if (supportsFeature(stateObj, WeatherEntityFeature.FORECAST_TWICE_DAILY)) {
      return "twice_daily";
    }
    return undefined;
  }

  private _handleForecastEvent(forecastEvent: ForecastEvent) {
    this._forecastEvent = forecastEvent;
  }

  private async _subscribeForecastEvents() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    const stateObj = this.hass!.states[this._config!.entity];
    if (!stateObj) {
      return;
    }
    const forecastType = this._forecastType(stateObj);
    if (forecastType) {
      this._subscribed = subscribeForecast(
        this.hass!,
        stateObj.entity_id,
        forecastType,
        (event) => this._handleForecastEvent(event)
      );
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config?.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    if (this._needForecastSubscription() && !this._subscribed) {
      this._subscribeForecastEvents();
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
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

    const hasSecondary = this._config.secondary_info;
    const weatherStateIcon = getWeatherStateIcon(stateObj.state, this);

    const forecastData = getForecast(stateObj.attributes, this._forecastEvent);
    const forecast = forecastData?.forecast;

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
          "text-content": !hasSecondary,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      >
        ${this._config.name || computeStateName(stateObj)}
        ${hasSecondary
          ? html`
              <div class="secondary">
                ${this._config.secondary_info === "entity-id"
                  ? stateObj.entity_id
                  : this._config.secondary_info === "last-changed"
                  ? html`
                      <ha-relative-time
                        .hass=${this.hass}
                        .datetime=${stateObj.last_changed}
                        capitalize
                      ></ha-relative-time>
                    `
                  : this._config.secondary_info === "last-updated"
                  ? html`
                      <ha-relative-time
                        .hass=${this.hass}
                        .datetime=${stateObj.last_updated}
                        capitalize
                      ></ha-relative-time>
                    `
                  : ""}
              </div>
            `
          : ""}
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
          ${isUnavailableState(stateObj.state) ||
          stateObj.attributes.temperature === undefined ||
          stateObj.attributes.temperature === null
            ? computeStateDisplay(
                this.hass.localize,
                stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities
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
          ${getSecondaryWeatherAttribute(this.hass!, stateObj, forecast!)}
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
