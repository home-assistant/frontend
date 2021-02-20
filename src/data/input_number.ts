import { HomeAssistant } from "../types";

export interface InputNumber {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  mode: "box" | "slider";
  icon?: string;
  initial?: number;
  unit_of_measurement?: string;
}

export interface InputNumberMutableParams {
  name: string;
  icon: string;
  initial: number;
  min: number;
  max: number;
  step: number;
  mode: "box" | "slider";
  unit_of_measurement?: string;
}

export const fetchInputNumber = (hass: HomeAssistant) =>
  hass.callWS<InputNumber[]>({ type: "input_number/list" });

export const createInputNumber = (
  hass: HomeAssistant,
  values: InputNumberMutableParams
) =>
  hass.callWS<InputNumber>({
    type: "input_number/create",
    ...values,
  });

export const updateInputNumber = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputNumberMutableParams>
) =>
  hass.callWS<InputNumber>({
    type: "input_number/update",
    input_number_id: id,
    ...updates,
  });

export const deleteInputNumber = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_number/delete",
    input_number_id: id,
  });
