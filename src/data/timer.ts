import {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import durationToSeconds from "../common/datetime/duration_to_seconds";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { HomeAssistant } from "../types";

export type TimerEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    duration: string;
    remaining: string;
    restore: boolean;
  };
};

export interface DurationDict {
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface Timer {
  id: string;
  name: string;
  icon?: string;
  duration?: string | number | DurationDict;
  restore?: boolean;
}

export interface TimerMutableParams {
  name: string;
  icon: string;
  duration: string | number | DurationDict;
  restore: boolean;
}

export const fetchTimer = (hass: HomeAssistant) =>
  hass.callWS<Timer[]>({ type: "timer/list" });

export const createTimer = (hass: HomeAssistant, values: TimerMutableParams) =>
  hass.callWS<Timer>({
    type: "timer/create",
    ...values,
  });

export const updateTimer = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<TimerMutableParams>
) =>
  hass.callWS<Timer>({
    type: "timer/update",
    timer_id: id,
    ...updates,
  });

export const deleteTimer = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "timer/delete",
    timer_id: id,
  });

export const timerTimeRemaining = (
  stateObj: HassEntity
): undefined | number => {
  if (!stateObj.attributes.remaining) {
    return undefined;
  }
  let timeRemaining = durationToSeconds(stateObj.attributes.remaining);

  if (stateObj.state === "active") {
    const now = new Date().getTime();
    const madeActive = new Date(stateObj.last_changed).getTime();
    timeRemaining = Math.max(timeRemaining - (now - madeActive) / 1000, 0);
  }

  return timeRemaining;
};

export const computeDisplayTimer = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  timeRemaining?: number
): string | null => {
  if (!stateObj) {
    return null;
  }

  if (stateObj.state === "idle" || timeRemaining === 0) {
    return hass.formatEntityState(stateObj);
  }

  let display = secondsToDuration(timeRemaining || 0);

  if (stateObj.state === "paused") {
    display = `${display} (${hass.formatEntityState(stateObj)})`;
  }

  return display;
};
