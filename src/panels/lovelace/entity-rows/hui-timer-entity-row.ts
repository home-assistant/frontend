import {
  html,
  LitElement,
  TemplateResult,
  property,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";

import timerTimeRemaining from "../../../common/entity/timer_time_remaining";
import secondsToDuration from "../../../common/datetime/seconds_to_duration";
import { HomeAssistant } from "../../../types";
import { EntityConfig } from "./types";
import { HassEntity } from "home-assistant-js-websocket";

class HuiTimerEntityRow extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;
  @property() private _timeRemaining?: number | null;
  private _hass?: HomeAssistant;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearInterval();
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <div>${this._computeDisplay(stateObj)}</div>
      </hui-generic-entity-row>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("hass") && this.hass !== this._hass) {
      const oldStateObj = this._hass
        ? this._hass.states[this._config!.entity]
        : "";
      const stateObj = this.hass!.states[this._config!.entity];
      this._hass = this.hass;

      if (oldStateObj !== stateObj) {
        this._startInterval(stateObj);
      } else if (!stateObj) {
        this._clearInterval();
      }
    }
  }

  private _clearInterval(): void {
    if (this._timeRemaining) {
      clearInterval(this._timeRemaining);
      this._timeRemaining = null;
    }
  }

  private _startInterval(stateObj: HassEntity): void {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      setInterval(() => this._calculateRemaining(stateObj), 1000);
    }
  }

  private _calculateRemaining(stateObj: HassEntity): void {
    this._timeRemaining = timerTimeRemaining(stateObj);
  }

  private _computeDisplay(stateObj: HassEntity): string | null {
    if (!stateObj) {
      return null;
    }

    if (stateObj.state === "idle" || this._timeRemaining === 0) {
      return this.hass!.localize("ui.card.timer." + stateObj.state);
    }

    let display = secondsToDuration(this._timeRemaining || 0);

    if (stateObj.state === "paused") {
      display += ` (${this.hass!.localize("ui.card.timer.paused")})`;
    }

    return display;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-entity-row": HuiTimerEntityRow;
  }
}

customElements.define("hui-timer-entity-row", HuiTimerEntityRow);
