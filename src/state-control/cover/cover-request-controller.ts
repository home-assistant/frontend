import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  CoverCommand,
  CoverControlMode,
  CoverEntity,
  CoverRequest,
} from "../../data/cover";
import { coverCurrentValue, isMoving } from "../../data/cover";

const SETTLE_DELAY = 2000;

type RequestPhase = "sent" | "moving" | "settling";

const roundedCurrentValue = (stateObj: CoverEntity, mode: CoverControlMode) => {
  const value = coverCurrentValue(stateObj, mode);
  return value === undefined ? undefined : Math.round(value);
};

const END_VALUES = { open: 100, close: 0 };

export class CoverRequestController implements ReactiveController {
  private _request?: CoverRequest;

  private _startValue?: number;

  private _phase: RequestPhase = "sent";

  private _settleTimer?: number;

  constructor(private readonly _host: ReactiveControllerHost) {
    this._host.addController(this);
  }

  public get request(): CoverRequest | undefined {
    return this._request;
  }

  public hostDisconnected(): void {
    clearTimeout(this._settleTimer);
  }

  public clear(): void {
    this._setRequest(undefined);
  }

  public commandSent(command: CoverCommand, stateObj: CoverEntity): void {
    const { mode } = command;
    if (command.action === "stop") {
      if (this._request?.mode === mode) {
        this._setRequest(undefined);
      }
      return;
    }
    const value =
      command.action === "set" ? command.value : END_VALUES[command.action];
    const startValue = roundedCurrentValue(stateObj, mode);
    this._setRequest(startValue === value ? undefined : { mode, value });
    this._startValue = startValue;
  }

  public stateChanged(stateObj: CoverEntity): void {
    const request = this._request;
    if (!request) {
      return;
    }
    const value = roundedCurrentValue(stateObj, request.mode);
    if (value === request.value) {
      this._setRequest(undefined);
      return;
    }
    if (request.mode === "position" && isMoving(stateObj)) {
      clearTimeout(this._settleTimer);
      this._phase = "moving";
      return;
    }
    if (this._phase === "moving") {
      this._setRequest(undefined);
      return;
    }
    if (
      this._phase === "sent" &&
      (value === undefined || value === this._startValue)
    ) {
      return;
    }
    this._phase = "settling";
    clearTimeout(this._settleTimer);
    this._settleTimer = window.setTimeout(
      () => this._setRequest(undefined),
      SETTLE_DELAY
    );
  }

  private _setRequest(request: CoverRequest | undefined) {
    clearTimeout(this._settleTimer);
    this._request = request;
    this._phase = "sent";
    this._host.requestUpdate();
  }
}
