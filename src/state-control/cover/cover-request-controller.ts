import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  CoverCommand,
  CoverControlMode,
  CoverEntity,
  CoverRequest,
} from "../../data/cover";
import { coverCurrentValue, isMoving } from "../../data/cover";

const roundedCurrentValue = (stateObj: CoverEntity, mode: CoverControlMode) => {
  const value = coverCurrentValue(stateObj, mode);
  return value === undefined ? undefined : Math.round(value);
};

const END_VALUES = { open: 100, close: 0 };

export class CoverRequestController implements ReactiveController {
  private _request?: CoverRequest;

  private _startValue?: number;

  private _moving = false;

  constructor(private readonly _host: ReactiveControllerHost) {
    this._host.addController(this);
  }

  public hostUpdate = (): void => undefined;

  public get request(): CoverRequest | undefined {
    return this._request;
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
      this._moving = true;
      return;
    }
    if (this._moving || (value !== undefined && value !== this._startValue)) {
      this._setRequest(undefined);
    }
  }

  private _setRequest(request: CoverRequest | undefined) {
    this._request = request;
    this._moving = false;
    this._host.requestUpdate();
  }
}
