import { HomeAssistant } from "../types";

export interface InputDateTime {
  id: string;
  name: string;
  icon?: string;
  initial?: string;
  has_time: boolean;
  has_date: boolean;
}

export interface InputDateTimeMutableParams {
  name: string;
  icon: string;
  initial: string;
  has_time: boolean;
  has_date: boolean;
}

export const setInputDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  time: string | undefined = undefined,
  date: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time, date };
  hass.callService(entityId.split(".", 1)[0], "set_datetime", param);
};

export const fetchInputDateTime = (hass: HomeAssistant) =>
  hass.callWS<InputDateTime[]>({ type: "input_datetime/list" });

export const createInputDateTime = (
  hass: HomeAssistant,
  values: InputDateTimeMutableParams
) =>
  hass.callWS<InputDateTime>({
    type: "input_datetime/create",
    ...values,
  });

export const updateInputDateTime = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputDateTimeMutableParams>
) =>
  hass.callWS<InputDateTime>({
    type: "input_datetime/update",
    input_datetime_id: id,
    ...updates,
  });

export const deleteInputDateTime = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_datetime/delete",
    input_datetime_id: id,
  });
