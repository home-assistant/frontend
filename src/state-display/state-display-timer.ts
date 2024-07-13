import type { HassEntity } from "home-assistant-js-websocket";
import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDisplayTimer, timerTimeRemaining } from "../data/timer";
import type { HomeAssistant } from "../types";

@customElement("state-display-timer")
class StateDisplayTimer extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @state() private timeRemaining?: number;

  private _updateRemaining: any;

  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);
    this.innerHTML =
      computeDisplayTimer(this.hass, this.stateObj, this.timeRemaining) ?? "-";
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.stateObj) {
      this._startInterval(this.stateObj);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearInterval();
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._startInterval(this.stateObj);
    }
  }

  private _clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = null;
    }
  }

  private _startInterval(stateObj: HassEntity) {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._updateRemaining = setInterval(
        () => this._calculateRemaining(this.stateObj),
        1000
      );
    }
  }

  private _calculateRemaining(stateObj: HassEntity) {
    this.timeRemaining = timerTimeRemaining(stateObj);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-display-timer": StateDisplayTimer;
  }
}
