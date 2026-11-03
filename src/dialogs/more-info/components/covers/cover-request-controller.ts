import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { CoverControlMode, CoverEntity } from "../../../../data/cover";
import { coverIsMoving, coverModeValue } from "../../../../data/cover";
import type {
  CoverCommand,
  CoverRequest,
} from "../../../../state-control/cover/ha-state-control-cover-drawing";

const SETTLE_DELAY = 2000;

interface PendingRequest extends CoverRequest {
  from?: number;
  moved: boolean;
  reportedMoving: boolean;
}

const roundedModeValue = (stateObj: CoverEntity, mode: CoverControlMode) => {
  const value = coverModeValue(stateObj, mode);
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
  private _request?: PendingRequest;

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
    this._set(undefined);
  }

  public commandSent(command: CoverCommand, stateObj: CoverEntity): void {
    const { service } = command;
    if (
      (service === "stop_cover" && this._request?.mode === "position") ||
      (service === "stop_cover_tilt" && this._request?.mode === "tilt")
    ) {
      this._set(undefined);
      return;
    }
    const request = requestFromCommand(command);
    if (!request) {
      return;
    }
    const from = roundedModeValue(stateObj, request.mode);
    this._set(
      from === request.value
        ? undefined
        : { ...request, from, moved: false, reportedMoving: false }
    );
  }

  public stateChanged(stateObj: CoverEntity): void {
    const request = this._request;
    if (!request) {
      return;
    }
    const value = roundedModeValue(stateObj, request.mode);
    if (value === request.value) {
      this._set(undefined);
      return;
    }
    if (request.mode === "position" && coverIsMoving(stateObj)) {
      clearTimeout(this._settleTimer);
      if (!request.reportedMoving) {
        this._request = { ...request, moved: true, reportedMoving: true };
      }
      return;
    }
    if (request.reportedMoving) {
      this._set(undefined);
      return;
    }
    const moved =
      request.moved || (value !== undefined && value !== request.from);
    if (!moved) {
      return;
    }
    clearTimeout(this._settleTimer);
    this._settleTimer = window.setTimeout(
      () => this._set(undefined),
      SETTLE_DELAY
    );
    if (!request.moved) {
      this._request = { ...request, moved: true };
    }
  }

  private _set(request: PendingRequest | undefined) {
    clearTimeout(this._settleTimer);
    this._request = request;
    this._host.requestUpdate();
  }
}
