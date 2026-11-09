import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";
import { UNAVAILABLE, UNKNOWN } from "./entity/entity";
import { CoverEntityFeature } from "./feature/cover_entity_feature";

export { CoverEntityFeature };

export const DEFAULT_COVER_FAVORITE_POSITIONS = [0, 25, 75, 100];

export type CoverControlMode = "position" | "tilt";

export type CoverService =
  | "open_cover"
  | "close_cover"
  | "stop_cover"
  | "set_cover_position"
  | "open_cover_tilt"
  | "close_cover_tilt"
  | "stop_cover_tilt"
  | "set_cover_tilt_position";

export interface CoverCommand {
  service: CoverService;
  value?: number;
}

export interface CoverRequest {
  mode: CoverControlMode;
  value: number;
}

export interface CoverSwipe {
  action: "open" | "close";
  passedHalfway: boolean;
}

export interface CoverDrag {
  value: number;
  swipe?: CoverSwipe;
}

export const coverSupportsPosition = (stateObj: CoverEntity) =>
  supportsFeature(stateObj, CoverEntityFeature.SET_POSITION);

export const coverSupportsTiltPosition = (stateObj: CoverEntity) =>
  supportsFeature(stateObj, CoverEntityFeature.SET_TILT_POSITION);

export const coverSupportsAnyPosition = (stateObj: CoverEntity) =>
  coverSupportsPosition(stateObj) || coverSupportsTiltPosition(stateObj);

const POSITION_FEATURES = [
  CoverEntityFeature.OPEN,
  CoverEntityFeature.CLOSE,
  CoverEntityFeature.STOP,
  CoverEntityFeature.SET_POSITION,
];

const TILT_FEATURES = [
  CoverEntityFeature.OPEN_TILT,
  CoverEntityFeature.CLOSE_TILT,
  CoverEntityFeature.STOP_TILT,
  CoverEntityFeature.SET_TILT_POSITION,
];

export const coverHasPositionControls = (stateObj: CoverEntity) =>
  POSITION_FEATURES.some((feature) => supportsFeature(stateObj, feature));

export const coverHasTiltControls = (stateObj: CoverEntity) =>
  TILT_FEATURES.some((feature) => supportsFeature(stateObj, feature));

export const defaultCoverMode = (stateObj: CoverEntity): CoverControlMode =>
  coverHasTiltControls(stateObj) && !coverHasPositionControls(stateObj)
    ? "tilt"
    : "position";

export const coverModeAttribute = (mode: CoverControlMode) =>
  mode === "tilt" ? "current_tilt_position" : "current_position";

export const coverServiceData = (
  stateObj: CoverEntity,
  { service, value }: CoverCommand
): Record<string, unknown> => {
  if (service === "set_cover_position") {
    return { entity_id: stateObj.entity_id, position: value };
  }
  if (service === "set_cover_tilt_position") {
    return { entity_id: stateObj.entity_id, tilt_position: value };
  }
  return { entity_id: stateObj.entity_id };
};

export function isFullyOpen(stateObj: CoverEntity) {
  return stateObj.attributes.current_position === 100;
}

export function isFullyClosed(stateObj: CoverEntity) {
  if (stateObj.attributes.current_position !== undefined) {
    return stateObj.attributes.current_position === 0;
  }
  return stateObj.state === "closed";
}

export function isFullyOpenTilt(stateObj: CoverEntity) {
  return stateObj.attributes.current_tilt_position === 100;
}

export function isFullyClosedTilt(stateObj: CoverEntity) {
  return stateObj.attributes.current_tilt_position === 0;
}

export function isOpening(stateObj: CoverEntity) {
  return stateObj.state === "opening";
}

export function isClosing(stateObj: CoverEntity) {
  return stateObj.state === "closing";
}

export function isMoving(stateObj: CoverEntity) {
  return isOpening(stateObj) || isClosing(stateObj);
}

export function isTiltOnly(stateObj: CoverEntity) {
  const supportsCover =
    supportsFeature(stateObj, CoverEntityFeature.OPEN) ||
    supportsFeature(stateObj, CoverEntityFeature.CLOSE) ||
    supportsFeature(stateObj, CoverEntityFeature.STOP);
  const supportsTilt =
    supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
    supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT) ||
    supportsFeature(stateObj, CoverEntityFeature.STOP_TILT);
  return supportsTilt && !supportsCover;
}

export function canOpen(stateObj: CoverEntity) {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isFullyOpen(stateObj) && !isOpening(stateObj));
}

export function canClose(stateObj: CoverEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isFullyClosed(stateObj) && !isClosing(stateObj));
}

export function canStop(stateObj: CoverEntity): boolean {
  return stateObj.state !== UNAVAILABLE;
}

export function canOpenTilt(stateObj: CoverEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || !isFullyOpenTilt(stateObj);
}

export function canCloseTilt(stateObj: CoverEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || !isFullyClosedTilt(stateObj);
}

export function canStopTilt(stateObj: CoverEntity): boolean {
  return stateObj.state !== UNAVAILABLE;
}

interface CoverEntityAttributes extends HassEntityAttributeBase {
  current_position?: number;
  current_tilt_position?: number;
  supported_speeds?: string[];
}

export interface CoverEntity extends HassEntityBase {
  attributes: CoverEntityAttributes;
}

export const coverCurrentValue = (
  stateObj: CoverEntity,
  mode: CoverControlMode
): number | undefined => {
  if (mode === "tilt") {
    return stateObj.attributes.current_tilt_position ?? undefined;
  }
  const position = stateObj.attributes.current_position;
  if (
    position != null ||
    supportsFeature(stateObj, CoverEntityFeature.SET_POSITION)
  ) {
    return position ?? undefined;
  }
  if (stateObj.state === UNKNOWN || stateObj.state === UNAVAILABLE) {
    return undefined;
  }
  return stateObj.state === "closed" || stateObj.state === "opening" ? 0 : 100;
};

declare global {
  interface HASSDomEvents {
    "cover-command": CoverCommand;
    "cover-drag-changed": { drag?: CoverDrag };
  }
}
