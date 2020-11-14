import { HomeAssistant } from "../types";

export interface InputTimetable {
  id: string;
  name: string;
  icon?: string;
}

export interface InputTimetableMutableParams {
  name: string;
  icon: string;
}

export const fetchInputTimetable = (hass: HomeAssistant) =>
  hass.callWS<InputTimetable[]>({ type: "input_timetable/list" });

export const createInputTimetable = (
  hass: HomeAssistant,
  values: InputTimetableMutableParams
) =>
  hass.callWS<InputTimetable>({
    type: "input_timetable/create",
    ...values,
  });

export const updateInputTimetable = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputTimetableMutableParams>
) =>
  hass.callWS<InputTimetable>({
    type: "input_timetable/update",
    input_timetable_id: id,
    ...updates,
  });

export const deleteInputTimetable = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_timetable/delete",
    input_timetable_id: id,
  });
