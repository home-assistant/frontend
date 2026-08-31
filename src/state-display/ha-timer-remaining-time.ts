import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { TimerRemainingTimeController } from "../common/controllers/timer-remaining-time-controller";
import { computeDisplayTimer } from "../data/timer";
import type { HomeAssistant } from "../types";

@customElement("ha-timer-remaining-time")
class HaTimerRemainingTime extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  private _remainingTime = new TimerRemainingTimeController(this);

  protected createRenderRoot() {
    return this;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._remainingTime.setStateObj(this.stateObj);
    }
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    this.innerHTML =
      computeDisplayTimer(
        this.hass.formatEntityState,
        this.stateObj,
        this._remainingTime.timeRemaining
      ) ?? "-";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timer-remaining-time": HaTimerRemainingTime;
  }
}
