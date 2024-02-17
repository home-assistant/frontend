import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { UNAVAILABLE } from "./entity";
import { stateActive } from "../common/entity/state_active";
import { HomeAssistant } from "../types";

export const enum ValveEntityFeature {
  OPEN = 1,
  CLOSE = 2,
  SET_POSITION = 4,
  STOP = 8,
}

export function isFullyOpen(stateObj: ValveEntity) {
  if (
    stateObj.attributes.current_position !== undefined &&
    stateObj.attributes.current_position !== null
  ) {
    return stateObj.attributes.current_position === 100;
  }
  return stateObj.state === "open";
}

export function isFullyClosed(stateObj: ValveEntity) {
  if (
    stateObj.attributes.current_position !== undefined &&
    stateObj.attributes.current_position !== null
  ) {
    return stateObj.attributes.current_position === 0;
  }
  return stateObj.state === "closed";
}

export function isOpening(stateObj: ValveEntity) {
  return stateObj.state === "opening";
}

export function isClosing(stateObj: ValveEntity) {
  return stateObj.state === "closing";
}

export function canOpen(stateObj: ValveEntity) {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isFullyOpen(stateObj) && !isOpening(stateObj));
}

export function canClose(stateObj: ValveEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isFullyClosed(stateObj) && !isClosing(stateObj));
}

export function canStop(stateObj: ValveEntity): boolean {
  return stateObj.state !== UNAVAILABLE;
}

interface ValveEntityAttributes extends HassEntityAttributeBase {
  current_position?: number;
  position?: number;
}

export interface ValveEntity extends HassEntityBase {
  attributes: ValveEntityAttributes;
}

export function computeValvePositionStateDisplay(
  stateObj: ValveEntity,
  hass: HomeAssistant,
  position?: number
) {
  const statePosition = stateActive(stateObj)
    ? stateObj.attributes.current_position
    : undefined;

  const currentPosition = position ?? statePosition;

  return currentPosition && currentPosition !== 100
    ? hass.formatEntityAttributeValue(
        stateObj,
        "current_position",
        Math.round(currentPosition)
      )
    : "";
}
