import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { stateActive } from "../common/entity/state_active";
import { supportsFeature } from "../common/entity/supports-feature";
import type { HomeAssistantFormatters } from "../types";
import { UNAVAILABLE } from "./entity/entity";
import { CoverEntityFeature } from "./feature/cover_entity_feature";

export { CoverEntityFeature };

export const DEFAULT_COVER_FAVORITE_POSITIONS = [0, 25, 75, 100];

export const coverSupportsPosition = (stateObj: CoverEntity) =>
  supportsFeature(stateObj, CoverEntityFeature.SET_POSITION);

export const coverSupportsTiltPosition = (stateObj: CoverEntity) =>
  supportsFeature(stateObj, CoverEntityFeature.SET_TILT_POSITION);

export const coverSupportsAnyPosition = (stateObj: CoverEntity) =>
  coverSupportsPosition(stateObj) || coverSupportsTiltPosition(stateObj);

export function isFullyOpen(stateObj: CoverEntity) {
  if (stateObj.attributes.current_position !== undefined) {
    return stateObj.attributes.current_position === 100;
  }
  return stateObj.state === "open";
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
  if (assumedState) {
    return true;
  }
  if (isFullyOpen(stateObj) || isOpening(stateObj)) {
    return false;
  }
  // A cover that exposes a stop action is treated as a motor that must be
  // stopped before it can reverse direction, so the open button is disabled
  // while it is closing. A cover without a stop action can reverse instantly,
  // so the open button stays available mid-travel.
  if (
    isClosing(stateObj) &&
    supportsFeature(stateObj, CoverEntityFeature.STOP)
  ) {
    return false;
  }
  return true;
}

export function canClose(stateObj: CoverEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  if (assumedState) {
    return true;
  }
  if (isFullyClosed(stateObj) || isClosing(stateObj)) {
    return false;
  }
  // See canOpen: a cover with a stop action must stop before reversing, so the
  // close button is disabled while it is opening. A cover without a stop action
  // can reverse instantly.
  if (
    isOpening(stateObj) &&
    supportsFeature(stateObj, CoverEntityFeature.STOP)
  ) {
    return false;
  }
  return true;
}

export function canStop(stateObj: CoverEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  // Stopping is only meaningful while the cover is actually moving. For an
  // assumed-state cover the movement is unknown, so keep the button available.
  return assumedState || isOpening(stateObj) || isClosing(stateObj);
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
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  // Mirror canStop: stopping is only meaningful while the cover is moving.
  // Covers have no tilt-specific movement state, so the shared opening/closing
  // state drives this too. Without this guard the combined stop button
  // (!canStop && !canStopTilt) stays enabled on an idle non-tilt cover.
  return assumedState || isOpening(stateObj) || isClosing(stateObj);
}

interface CoverEntityAttributes extends HassEntityAttributeBase {
  current_position?: number;
  current_tilt_position?: number;
}

export interface CoverEntity extends HassEntityBase {
  attributes: CoverEntityAttributes;
}

export function computeCoverPositionStateDisplay(
  stateObj: CoverEntity,
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"],
  position?: number
) {
  const statePosition = stateActive(stateObj)
    ? (stateObj.attributes.current_position ??
      stateObj.attributes.current_tilt_position)
    : undefined;

  const currentPosition = position ?? statePosition;

  return currentPosition && currentPosition !== 100
    ? formatEntityAttributeValue(
        stateObj,
        // Always use position as it's the same formatting as tilt position
        "current_position",
        Math.round(currentPosition)
      )
    : "";
}
