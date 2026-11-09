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

const requestFromCommand = ({
  service,
  value,
}: CoverCommand): CoverRequest | undefined => {
  switch (service) {
    case "open_cover":
      return { mode: "position", value: 100 };
    case "close_cover":
      return { mode: "position", value: 0 };
    case "set_cover_position":
      return value === undefined ? undefined : { mode: "position", value };
    case "open_cover_tilt":
      return { mode: "tilt", value: 100 };
    case "close_cover_tilt":
      return { mode: "tilt", value: 0 };
    case "set_cover_tilt_position":
      return value === undefined ? undefined : { mode: "tilt", value };
    default:
      return undefined;
  }
};

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
    const { service } = command;
    if (
      (service === "stop_cover" && this._request?.mode === "position") ||
      (service === "stop_cover_tilt" && this._request?.mode === "tilt")
    ) {
      this._setRequest(undefined);
      return;
    }
    const request = requestFromCommand(command);
    if (!request) {
      return;
    }
    const startValue = roundedCurrentValue(stateObj, request.mode);
    this._setRequest(startValue === request.value ? undefined : request);
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
