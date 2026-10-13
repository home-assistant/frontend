import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { createDurationData } from "../common/datetime/create_duration_data";
import durationToSeconds, {
  durationDataToSeconds,
} from "../common/datetime/duration_to_seconds";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { formatNumericDuration } from "../common/datetime/format_duration";
import type { FormatEntityStateFunc } from "../common/translations/entity-state";
import type { HaDurationData } from "../components/ha-duration-input";
import type { HomeAssistant } from "../types";
import type { FrontendLocaleData } from "./translation";

export type TimerEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    duration: string;
    remaining: string;
    restore: boolean;
    finishes_at?: string;
    last_transition?: string;
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

// True when this state change is the timer completing: it ran out or
// timer.finish was called. Cancel also ends in "idle" but sets
// last_transition to "cancelled", so it does not match.
export const timerJustFinished = (
  oldStateObj: HassEntity | undefined,
  stateObj: HassEntity
): boolean =>
  oldStateObj !== undefined &&
  oldStateObj.state !== "idle" &&
  stateObj.state === "idle" &&
  stateObj.attributes.last_transition === "finished";

export const timerTimeRemaining = (
  stateObj: HassEntity
): undefined | number => {
  if (!stateObj.attributes.remaining) {
    return undefined;
  }
  let timeRemaining = durationToSeconds(stateObj.attributes.remaining);

  if (stateObj.state === "active") {
    const now = new Date().getTime();
    const finishes = new Date(stateObj.attributes.finishes_at).getTime();
    timeRemaining = Math.max((finishes - now) / 1000, 0);
  }

  return timeRemaining;
};

export const computeDisplayTimer = (
  formatEntityState: FormatEntityStateFunc,
  stateObj: HassEntity,
  timeRemaining?: number
): string | null => {
  if (!stateObj) {
    return null;
  }

  if (stateObj.state === "idle" || timeRemaining === 0) {
    return formatEntityState(stateObj);
  }

  let display = secondsToDuration(timeRemaining || 0) || "0";

  if (stateObj.state === "paused") {
    display = `${display} (${formatEntityState(stateObj)})`;
  }

  return display;
};

const leftPad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

// Normalize duration data to whole-second hours/minutes/seconds fields, so
// out-of-range values ({seconds: 3600}) and fractional seconds cannot reach
// duration inputs or the serialized config. Timers only support whole seconds.
export const normalizeTimerDuration = (
  data: HaDurationData
): HaDurationData => {
  const totalSeconds = Math.floor(durationDataToSeconds(data));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

// Serialize duration data to the "H:MM:SS" format accepted by timer.start.
export const durationDataToTimerString = (data: HaDurationData): string => {
  const { hours = 0, minutes = 0, seconds = 0 } = normalizeTimerDuration(data);
  return `${hours}:${leftPad(minutes)}:${leftPad(seconds)}`;
};

// Prefill for the duration input: always the configured duration, independent
// of the live countdown. The field is meant to be edited, not to mirror the
// remaining time.
export const timerDurationData = (
  stateObj: HassEntity
): HaDurationData | undefined =>
  createDurationData(stateObj.attributes.duration);

export const normalizeTimerPresets = (presets?: number[]): number[] => [
  ...new Set(
    (presets ?? [])
      .map((preset) => Math.floor(Number(preset)))
      .filter((seconds) => Number.isFinite(seconds) && seconds > 0)
  ),
];

// Presets are at least one second, so the formatter never returns null here.
export const timerPresetLabel = (
  locale: FrontendLocaleData,
  seconds: number
): string =>
  formatNumericDuration(locale, normalizeTimerDuration({ seconds })) ?? "";
