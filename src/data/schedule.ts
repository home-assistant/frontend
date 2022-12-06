import {
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
} from "date-fns";
import { HomeAssistant } from "../types";

export const weekdays = {
  sunday: nextSunday,
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
} as const;

export interface ScheduleDay {
  from: string;
  to: string;
}

type ScheduleDays = { [K in keyof typeof weekdays]?: ScheduleDay[] };

export interface Schedule extends ScheduleDays {
  id: string;
  name: string;
  icon?: string;
}

export interface ScheduleMutableParams {
  name: string;
  icon: string;
}

export const fetchSchedule = (hass: HomeAssistant) =>
  hass.callWS<Schedule[]>({ type: "schedule/list" });

export const createSchedule = (
  hass: HomeAssistant,
  values: ScheduleMutableParams
) =>
  hass.callWS<Schedule>({
    type: "schedule/create",
    ...values,
  });

export const updateSchedule = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<ScheduleMutableParams>
) =>
  hass.callWS<Schedule>({
    type: "schedule/update",
    schedule_id: id,
    ...updates,
  });

export const deleteSchedule = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "schedule/delete",
    schedule_id: id,
  });

export const getScheduleTime = (date: Date): string =>
  `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;
