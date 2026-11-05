import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { UNAVAILABLE } from "./entity/entity";

export type LawnMowerEntityState =
  "paused" | "mowing" | "returning" | "docked" | "idle" | "error";

export enum LawnMowerEntityFeature {
  START_MOWING = 1,
  PAUSE = 2,
  DOCK = 4,
  STOP = 8,
}

interface LawnMowerEntityAttributes
  extends HassEntityAttributeBase, Record<string, any> {}

export interface LawnMowerEntity extends HassEntityBase {
  attributes: LawnMowerEntityAttributes;
}

export function isMowing(stateObj: LawnMowerEntity): boolean {
  return stateObj.state === "mowing";
}

export function canStartMowing(stateObj: LawnMowerEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return stateObj.state !== "mowing";
}

export function canPause(stateObj: LawnMowerEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return stateObj.state !== "paused";
}

export function canStop(stateObj: LawnMowerEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return !["docked", "idle"].includes(stateObj.state);
}

export function canDock(stateObj: LawnMowerEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return stateObj.state !== "docked";
}
