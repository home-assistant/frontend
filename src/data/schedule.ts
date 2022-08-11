import { HomeAssistant } from "../types";

export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface ScheduleDay {
  from: string;
  to: string;
}

export interface Schedule {
  id: string;
  name: string;
  icon?: string;
  monday?: ScheduleDay[];
  tuesday?: ScheduleDay[];
  wednesday?: ScheduleDay[];
  thursday?: ScheduleDay[];
  friday?: ScheduleDay[];
  saturday?: ScheduleDay[];
  sunday?: ScheduleDay[];
}

export interface ScheduleMutableParams {
  name: string;
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
