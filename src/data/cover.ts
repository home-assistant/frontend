import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";

export const SUPPORT_OPEN = 1;
export const SUPPORT_CLOSE = 2;
export const SUPPORT_SET_POSITION = 4;
export const SUPPORT_STOP = 8;
export const SUPPORT_OPEN_TILT = 16;
export const SUPPORT_CLOSE_TILT = 32;
export const SUPPORT_STOP_TILT = 64;
export const SUPPORT_SET_TILT_POSITION = 128;

export const FEATURE_CLASS_NAMES = {
  4: "has-set_position",
  16: "has-open_tilt",
  32: "has-close_tilt",
  64: "has-stop_tilt",
  128: "has-set_tilt_position",
};

export const supportsOpen = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_OPEN);

export const supportsClose = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_CLOSE);

export const supportsSetPosition = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_SET_POSITION);

export const supportsStop = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_STOP);

export const supportsOpenTilt = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_OPEN_TILT);

export const supportsCloseTilt = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_CLOSE_TILT);

export const supportsStopTilt = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_STOP_TILT);

export const supportsSetTiltPosition = (stateObj) =>
  supportsFeature(stateObj, SUPPORT_SET_TILT_POSITION);

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
    supportsOpen(stateObj) || supportsClose(stateObj) || supportsStop(stateObj);
  const supportsTilt =
    supportsOpenTilt(stateObj) ||
    supportsCloseTilt(stateObj) ||
    supportsStopTilt(stateObj);
  return supportsTilt && !supportsCover;
}

interface CoverEntityAttributes extends HassEntityAttributeBase {
  current_position: number;
  current_tilt_position: number;
}

export interface CoverEntity extends HassEntityBase {
  attributes: CoverEntityAttributes;
}
