import {
  mdiFan,
  mdiFanOff,
  mdiFanSpeed1,
  mdiFanSpeed2,
  mdiFanSpeed3,
} from "@mdi/js";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { stateActive } from "../common/entity/state_active";
import type { HomeAssistant } from "../types";

export enum FanEntityFeature {
  SET_SPEED = 1,
  OSCILLATE = 2,
  DIRECTION = 4,
  PRESET_MODE = 8,
  TURN_OFF = 16,
  TURN_ON = 32,
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

export type FanDirection = "forward" | "reverse";

// Named speeds are used when there are icons for every step. Fans with more
// steps use numbered speeds ("1", "2", ...) instead.
export type FanSpeed = "off" | "low" | "medium" | "high" | "on" | `${number}`;

const FAN_SPEEDS_NAMED: Partial<Record<number, FanSpeed[]>> = {
  2: ["off", "on"],
  3: ["off", "low", "high"],
  4: ["off", "low", "medium", "high"],
};

export const FAN_SPEED_COUNT_MAX_FOR_BUTTONS = 6;

export function computeFanSpeedCount(stateObj: FanEntity): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;
  return speedCount;
}

export function computeFanSpeeds(stateObj: FanEntity): FanSpeed[] | undefined {
  const speedCount = computeFanSpeedCount(stateObj);
  if (speedCount > FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
    return undefined;
  }
  return (
    FAN_SPEEDS_NAMED[speedCount] ?? [
      "off",
      ...Array.from(
        { length: speedCount - 1 },
        (_, index) => `${index + 1}` as const
      ),
    ]
  );
}

export const isNumberedFanSpeed = (speed: FanSpeed): speed is `${number}` =>
  !isNaN(Number(speed));

export function fanPercentageToSpeed(
  stateObj: FanEntity,
  value: number
): FanSpeed {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedValue = Math.round(value / step);

  const speeds = computeFanSpeeds(stateObj);
  return speeds?.[speedValue] ?? "off";
}

export function fanSpeedToPercentage(
  stateObj: FanEntity,
  speed: FanSpeed
): number {
  const step = stateObj.attributes.percentage_step ?? 1;

  const speeds = computeFanSpeeds(stateObj);

  if (!speeds) {
    return 0;
  }

  const speedValue = speeds.indexOf(speed);
  if (speedValue === -1) {
    return 0;
  }
  return Math.floor(speedValue * step);
}

export function computeFanSpeedIcon(
  stateObj: FanEntity,
  speed: FanSpeed
): string | undefined {
  if (speed === "on") {
    return mdiFan;
  }
  if (speed === "off") {
    return mdiFanOff;
  }
  if (isNumberedFanSpeed(speed)) {
    return undefined;
  }
  const index = computeFanSpeeds(stateObj)?.indexOf(speed) ?? 1;
  return [mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3][index - 1];
}

export function computeFanSpeedStateDisplay(
  stateObj: FanEntity,
  formatters: Pick<HomeAssistant, "formatEntityAttributeValue">,
  speed?: number
) {
  const percentage = stateActive(stateObj)
    ? stateObj.attributes.percentage
    : undefined;
  const currentSpeed = speed ?? percentage;

  return currentSpeed
    ? formatters.formatEntityAttributeValue(
        stateObj,
        "percentage",
        Math.round(currentSpeed)
      )
    : "";
}
