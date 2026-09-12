import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { HassEntity } from "home-assistant-js-websocket";
import { timerTimeRemaining } from "../../data/timer";

/**
 * Tracks the live remaining time of a timer entity. While the timer is
 * active, the host is re-rendered every second with an updated
 * `timeRemaining`, computed from the entity's `finishes_at` attribute.
 *
 * The host must call `setStateObj` whenever its timer entity changes.
 */
export class TimerRemainingTimeController implements ReactiveController {
  public timeRemaining?: number;

  private _host: ReactiveControllerHost;

  private _stateObj?: HassEntity;

  private _interval?: number;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  public setStateObj(stateObj: HassEntity | undefined): void {
    this._stateObj = stateObj;
    this._startInterval();
  }

  public hostConnected(): void {
    this._startInterval();
  }

  public hostDisconnected(): void {
    this._clearInterval();
  }

  private _startInterval(): void {
    this._clearInterval();
    if (!this._stateObj) {
      this.timeRemaining = undefined;
      return;
    }
    this._calculateRemaining();

    if (this._stateObj.state === "active") {
      this._interval = window.setInterval(() => {
        this._calculateRemaining();
        this._host.requestUpdate();
      }, 1000);
    }
  }

  private _clearInterval(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _calculateRemaining(): void {
    this.timeRemaining = this._stateObj
      ? timerTimeRemaining(this._stateObj)
      : undefined;
  }
}
