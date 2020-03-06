import {
  html,
  LitElement,
  TemplateResult,
  property,
  PropertyValues,
  customElement,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { timerTimeRemaining } from "../../../common/entity/timer_time_remaining";
import secondsToDuration from "../../../common/datetime/seconds_to_duration";

import { HomeAssistant } from "../../../types";
import { EntityConfig } from "./types";
import { HassEntity } from "home-assistant-js-websocket";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-timer-entity-row")
class HuiTimerEntityRow extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  @property() private _timeRemaining?: number;

  private _interval?: number;

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

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._config && this._config.entity) {
      const stateObj = this.hass!.states[this._config!.entity];
      if (stateObj) {
        this._startInterval(stateObj);
      }
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

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

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <div class="text-content">${this._computeDisplay(stateObj)}</div>
      </hui-generic-entity-row>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_timeRemaining")) {
      return true;
    }

    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("hass")) {
      const stateObj = this.hass!.states[this._config!.entity];
      const oldHass = changedProps.get("hass") as this["hass"];
      const oldStateObj = oldHass
        ? oldHass.states[this._config!.entity]
        : undefined;

      if (oldStateObj !== stateObj) {
        this._startInterval(stateObj);
      } else if (!stateObj) {
        this._clearInterval();
      }
    }
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _startInterval(stateObj: HassEntity): void {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._interval = window.setInterval(
        () => this._calculateRemaining(stateObj),
        1000
      );
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
      return this.hass!.localize("state.timer." + stateObj.state);
    }

    let display = secondsToDuration(this._timeRemaining || 0);

    if (stateObj.state === "paused") {
      display += ` (${this.hass!.localize("state.timer.paused")})`;
    }

    return display;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-entity-row": HuiTimerEntityRow;
  }
}
