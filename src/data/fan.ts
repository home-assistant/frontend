import {
  mdiFan,
  mdiFanOff,
  mdiFanSpeed1,
  mdiFanSpeed2,
  mdiFanSpeed3,
} from "@mdi/js";
import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { stateActive } from "../common/entity/state_active";
import type { HomeAssistant } from "../types";

export const enum FanEntityFeature {
  SET_SPEED = 1,
  OSCILLATE = 2,
  DIRECTION = 4,
  PRESET_MODE = 8,
}

interface FanEntityAttributes extends HassEntityAttributeBase {
  direction?: string;
  oscillating?: boolean;
  percentage?: number;
  percentage_step?: number;
  preset_mode?: string;
  preset_modes?: string[];
}

export interface FanEntity extends HassEntityBase {
  attributes: FanEntityAttributes;
}

export type FanSpeed = "off" | "low" | "medium" | "high" | "on";

export const FAN_SPEEDS: Partial<Record<number, FanSpeed[]>> = {
  2: ["off", "on"],
  3: ["off", "low", "high"],
  4: ["off", "low", "medium", "high"],
};

export function fanPercentageToSpeed(
  stateObj: FanEntity,
  value: number
): FanSpeed {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedValue = Math.round(value / step);
  const speedCount = Math.round(100 / step) + 1;

  const speeds = FAN_SPEEDS[speedCount];
  return speeds?.[speedValue] ?? "off";
}

export function fanSpeedToPercentage(
  stateObj: FanEntity,
  speed: FanSpeed
): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;

  const speeds = FAN_SPEEDS[speedCount];

  if (!speeds) {
    return 0;
  }

  const speedValue = speeds.indexOf(speed);
  if (speedValue === -1) {
    return 0;
  }
  return Math.floor(speedValue * step);
}

export function computeFanSpeedCount(stateObj: FanEntity): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;
  return speedCount;
}

export function computeFanSpeedIcon(
  stateObj: FanEntity,
  speed: FanSpeed
): string {
  const speedCount = computeFanSpeedCount(stateObj);
  const speeds = FAN_SPEEDS[speedCount];
  const index = speeds?.indexOf(speed) ?? 1;

  return speed === "on"
    ? mdiFan
    : speed === "off"
    ? mdiFanOff
    : [mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3][index - 1];
}
export const FAN_SPEED_COUNT_MAX_FOR_BUTTONS = 4;

export function computeFanSpeedStateDisplay(
  stateObj: FanEntity,
  hass: HomeAssistant,
  speed?: number
) {
  const percentage = stateActive(stateObj)
    ? stateObj.attributes.percentage
    : undefined;
  const currentSpeed = speed ?? percentage;

  return currentSpeed
    ? hass.formatEntityAttributeValue(
        stateObj,
        "percentage",
        Math.round(currentSpeed)
      )
    : "";
}
