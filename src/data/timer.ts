import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export type TimerEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    duration: string;
    remaining: string;
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
}

export interface TimerMutableParams {
  name: string;
  icon: string;
  duration: string | number | DurationDict;
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
