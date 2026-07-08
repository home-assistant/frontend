import type { HomeAssistant } from "../types";

export interface InputColor {
  id: string;
  name: string;
  icon?: string;
  initial_color?: string;
  initial_kelvin?: number;
  initial_brightness?: number;
}

export interface InputColorMutableParams {
  name: string;
  icon?: string;
  initial_color?: string;
  initial_kelvin?: number;
  initial_brightness?: number;
}

export const fetchInputColor = (hass: HomeAssistant) =>
  hass.callWS<InputColor[]>({ type: "input_color/list" });

export const createInputColor = (
  hass: HomeAssistant,
  values: InputColorMutableParams
) =>
  hass.callWS<InputColor>({
    type: "input_color/create",
    ...values,
  });

export const updateInputColor = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputColorMutableParams>
) =>
  hass.callWS<InputColor>({
    type: "input_color/update",
    input_color_id: id,
    ...updates,
  });

export const deleteInputColor = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_color/delete",
    input_color_id: id,
  });
