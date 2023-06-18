import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { UNAVAILABLE } from "./entity";

export type VacuumEntityState =
  | "on"
  | "off"
  | "cleaning"
  | "docked"
  | "idle"
  | "paused"
  | "returning"
  | "error";

export const enum VacuumEntityFeature {
  TURN_ON = 1,
  TURN_OFF = 2,
  PAUSE = 4,
  STOP = 8,
  RETURN_HOME = 16,
  FAN_SPEED = 32,
  BATTERY = 64,
  STATUS = 128,
  SEND_COMMAND = 256,
  LOCATE = 512,
  CLEAN_SPOT = 1024,
  MAP = 2048,
  STATE = 4096,
  START = 8192,
}

interface VacuumEntityAttributes extends HassEntityAttributeBase {
  battery_level?: number;
  fan_speed?: any;
  [key: string]: any;
}

export interface VacuumEntity extends HassEntityBase {
  attributes: VacuumEntityAttributes;
}

export function isCleaning(stateObj: VacuumEntity): boolean {
  return ["cleaning", "on"].includes(stateObj.state);
}

export function canStart(stateObj: VacuumEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return !isCleaning(stateObj);
}

export function canStop(stateObj: VacuumEntity): boolean {
  return !["docked", "off", "idle"].includes(stateObj.state);
}

export function canReturnHome(stateObj: VacuumEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return stateObj.state !== "returning";
}
