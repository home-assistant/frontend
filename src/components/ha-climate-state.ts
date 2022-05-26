import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { formatNumber } from "../common/number/format_number";
import { CLIMATE_PRESET_NONE } from "../data/climate";
import { UNAVAILABLE_STATES } from "../data/entity";
import type { HomeAssistant } from "../types";

@customElement("ha-climate-state")
class HaClimateState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  protected render(): TemplateResult {
    const currentStatus = this._computeCurrentStatus();

    return html`<div class="target">
        ${!UNAVAILABLE_STATES.includes(this.stateObj.state)
          ? html`<span class="state-label">
                ${this._localizeState()}
                ${this.stateObj.attributes.preset_mode &&
                this.stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                  ? html`-
                    ${this.hass.localize(
                      `state_attributes.climate.preset_mode.${this.stateObj.attributes.preset_mode}`
                    ) || this.stateObj.attributes.preset_mode}`
                  : ""}
              </span>
              <div class="unit">${this._computeTarget()}</div>`
          : this._localizeState()}
      </div>

      ${currentStatus && !UNAVAILABLE_STATES.includes(this.stateObj.state)
        ? html`<div class="current">
            ${this.hass.localize("ui.card.climate.currently")}:
            <div class="unit">${currentStatus}</div>
          </div>`
        : ""}`;
  }

  private _computeCurrentStatus(): string | undefined {
    if (!this.hass || !this.stateObj) {
      return undefined;
    }

    if (this.stateObj.attributes.current_temperature != null) {
      return `${formatNumber(
        this.stateObj.attributes.current_temperature,
        this.hass.locale
      )} ${this.hass.config.unit_system.temperature}`;
    }

    if (this.stateObj.attributes.current_humidity != null) {
      return `${formatNumber(
        this.stateObj.attributes.current_humidity,
        this.hass.locale
      )} %`;
    }

    return undefined;
  }

  private _computeTarget(): string {
    if (!this.hass || !this.stateObj) {
      return "";
    }

    if (
      this.stateObj.attributes.target_temp_low != null &&
      this.stateObj.attributes.target_temp_high != null
    ) {
      return `${formatNumber(
        this.stateObj.attributes.target_temp_low,
        this.hass.locale
      )}-${formatNumber(
        this.stateObj.attributes.target_temp_high,
        this.hass.locale
      )} ${this.hass.config.unit_system.temperature}`;
    }

    if (this.stateObj.attributes.temperature != null) {
      return `${formatNumber(
        this.stateObj.attributes.temperature,
        this.hass.locale
      )} ${this.hass.config.unit_system.temperature}`;
    }
    if (
      this.stateObj.attributes.target_humidity_low != null &&
      this.stateObj.attributes.target_humidity_high != null
    ) {
      return `${formatNumber(
        this.stateObj.attributes.target_humidity_low,
        this.hass.locale
      )}-${formatNumber(
        this.stateObj.attributes.target_humidity_high,
        this.hass.locale
      )} %`;
    }

    if (this.stateObj.attributes.humidity != null) {
      return `${formatNumber(
        this.stateObj.attributes.humidity,
        this.hass.locale
      )} %`;
    }

    return "";
  }

  private _localizeState(): string {
    if (UNAVAILABLE_STATES.includes(this.stateObj.state)) {
      return this.hass.localize(`state.default.${this.stateObj.state}`);
    }

    const stateString = this.hass.localize(
      `component.climate.state._.${this.stateObj.state}`
    );

    return this.stateObj.attributes.hvac_action
      ? `${this.hass.localize(
          `state_attributes.climate.hvac_action.${this.stateObj.attributes.hvac_action}`
        )} (${stateString})`
      : stateString;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        white-space: nowrap;
      }

      .target {
        color: var(--primary-text-color);
      }

      .current {
        color: var(--secondary-text-color);
      }

      .state-label {
        font-weight: bold;
        text-transform: capitalize;
      }

      .unit {
        display: inline-block;
        direction: ltr;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-climate-state": HaClimateState;
  }
}
