import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { CLIMATE_PRESET_NONE, ClimateEntity } from "../data/climate";
import { isUnavailableState, OFF } from "../data/entity";
import type { HomeAssistant } from "../types";

@customElement("ha-climate-state")
class HaClimateState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  protected render(): TemplateResult {
    const currentStatus = this._computeCurrentStatus();

    return html`<div class="target">
        ${!isUnavailableState(this.stateObj.state)
          ? html`<span class="state-label">
                ${this._localizeState()}
                ${this.stateObj.attributes.preset_mode &&
                this.stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                  ? html`-
                    ${this.hass.formatEntityAttributeValue(
                      this.stateObj,
                      "preset_mode"
                    )}`
                  : nothing}
              </span>
              <div class="unit">${this._computeTarget()}</div>`
          : this._localizeState()}
      </div>

      ${currentStatus && !isUnavailableState(this.stateObj.state)
        ? html`
            <div class="current">
              ${this.hass.localize("ui.card.climate.currently")}:
              <div class="unit">${currentStatus}</div>
            </div>
          `
        : nothing}`;
  }

  private _computeCurrentStatus(): string | undefined {
    if (!this.hass || !this.stateObj) {
      return undefined;
    }
    if (
      this.stateObj.attributes.current_temperature != null &&
      this.stateObj.attributes.current_humidity != null
    ) {
      return `${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_temperature"
      )}/
      ${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity"
      )}`;
    }

    if (this.stateObj.attributes.current_temperature != null) {
      return this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_temperature"
      );
    }

    if (this.stateObj.attributes.current_humidity != null) {
      return this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity"
      );
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
      return `${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "target_temp_low"
      )}-${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "target_temp_high"
      )}`;
    }

    if (this.stateObj.attributes.temperature != null) {
      return this.hass.formatEntityAttributeValue(this.stateObj, "temperature");
    }
    if (
      this.stateObj.attributes.target_humidity_low != null &&
      this.stateObj.attributes.target_humidity_high != null
    ) {
      return `${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "target_humidity_low"
      )}-${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "target_humidity_high"
      )}`;
    }

    if (this.stateObj.attributes.humidity != null) {
      return this.hass.formatEntityAttributeValue(this.stateObj, "humidity");
    }

    return "";
  }

  private _localizeState(): string {
    if (isUnavailableState(this.stateObj.state)) {
      return this.hass.localize(`state.default.${this.stateObj.state}`);
    }

    const stateString = this.hass.formatEntityState(this.stateObj);

    if (this.stateObj.attributes.hvac_action && this.stateObj.state !== OFF) {
      const actionString = this.hass.formatEntityAttributeValue(
        this.stateObj,
        "hvac_action"
      );
      return `${actionString} (${stateString})`;
    }

    return stateString;
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
