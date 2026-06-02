import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { OFF, UNAVAILABLE, UNKNOWN } from "../data/entity/entity";
import type { HumidifierEntity } from "../data/humidifier";
import type { HomeAssistant } from "../types";

@customElement("ha-humidifier-state")
class HaHumidifierState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HumidifierEntity;

  protected render(): TemplateResult {
    const currentStatus = this._computeCurrentStatus();
    const noValue =
      this.stateObj.state === UNAVAILABLE || this.stateObj.state === UNKNOWN;

    return html`<div class="target">
        ${!noValue
          ? html`<span class="state-label">
                ${this._localizeState()}
                ${this.stateObj.attributes.mode
                  ? html`-
                    ${this.hass.formatEntityAttributeValue(
                      this.stateObj,
                      "mode"
                    )}`
                  : ""}
              </span>
              <div class="unit">${this._computeTarget()}</div>`
          : this._localizeState()}
      </div>

      ${currentStatus && !noValue
        ? html`<div class="current">
            ${this.hass.localize("ui.card.humidifier.currently")}:
            <div class="unit">${currentStatus}</div>
          </div>`
        : ""}`;
  }

  private _computeCurrentStatus(): string | undefined {
    if (!this.hass || !this.stateObj) {
      return undefined;
    }

    if (this.stateObj.attributes.current_humidity != null) {
      return `${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity"
      )}`;
    }

    return undefined;
  }

  private _computeTarget(): string {
    if (!this.hass || !this.stateObj) {
      return "";
    }

    if (this.stateObj.attributes.humidity != null) {
      return `${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "humidity"
      )}`;
    }

    return "";
  }

  private _localizeState(): string {
    if (
      this.stateObj.state === UNAVAILABLE ||
      this.stateObj.state === UNKNOWN
    ) {
      return this.hass.localize(`state.default.${this.stateObj.state}`);
    }

    const stateString = this.hass.formatEntityState(this.stateObj);

    if (this.stateObj.attributes.action && this.stateObj.state !== OFF) {
      const actionString = this.hass.formatEntityAttributeValue(
        this.stateObj,
        "action"
      );
      return `${actionString} (${stateString})`;
    }

    return stateString;
  }

  static styles = css`
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
      font-weight: var(--ha-font-weight-bold);
    }

    .unit {
      display: inline-block;
      direction: ltr;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-humidifier-state": HaHumidifierState;
  }
}
