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

// Fans with up to this many speeds (off included) show buttons by default.
export const FAN_SPEED_COUNT_MAX_FOR_BUTTONS = 6;

// Fans with more speeds than this (off included) can only show a slider.
export const FAN_SPEED_COUNT_MAX_FOR_DISCRETE_SPEEDS = 11;

export type FanSpeedStyle = "buttons" | "slider";

export function computeFanSpeedCount(stateObj: FanEntity): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;
  return speedCount;
}

export function computeFanSpeeds(stateObj: FanEntity): FanSpeed[] | undefined {
  const speedCount = computeFanSpeedCount(stateObj);
  if (speedCount > FAN_SPEED_COUNT_MAX_FOR_DISCRETE_SPEEDS) {
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

export const computeDefaultFanSpeedStyle = (
  stateObj: FanEntity
): FanSpeedStyle =>
  computeFanSpeedCount(stateObj) <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS
    ? "buttons"
    : "slider";

// A slider brings nothing to an off/on fan, so it always shows buttons.
export const supportsFanSpeedStyleChoice = (stateObj: FanEntity): boolean => {
  const speedCount = computeFanSpeedCount(stateObj);
  return (
    speedCount >= 3 && speedCount <= FAN_SPEED_COUNT_MAX_FOR_DISCRETE_SPEEDS
  );
};

// Fans without a choice always use their default style, whatever is requested.
export const resolveFanSpeedStyle = (
  stateObj: FanEntity,
  style?: FanSpeedStyle
): FanSpeedStyle =>
  supportsFanSpeedStyleChoice(stateObj)
    ? (style ?? computeDefaultFanSpeedStyle(stateObj))
    : computeDefaultFanSpeedStyle(stateObj);

export const isNumberedFanSpeed = (speed: FanSpeed): speed is `${number}` =>
  !isNaN(Number(speed));

// Minimum target size for WCAG 2.2 AA (2.5.8). Feature buttons have no gap
// between them, so each one must be at least this wide. It also fits the off
// icon and two-digit speeds. Off and 6 speeds (168px) fit as buttons in a
// half-width tile, which is 172px wide on desktop and on phones from 393px.
const FAN_SPEED_BUTTON_MIN_WIDTH = 24;

// Width needed to show every speed as a button.
export const computeFanSpeedButtonsMinWidth = (speeds: FanSpeed[]): number =>
  speeds.length * FAN_SPEED_BUTTON_MIN_WIDTH;

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
