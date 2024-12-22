import { HomeAssistant } from "../types";

export interface InputButton {
  id: string;
  name: string;
  icon?: string;
}

export interface InputButtonMutableParams {
  name: string;
  icon: string;
}

export const fetchInputButton = (hass: HomeAssistant) =>
  hass.callWS<InputButton[]>({ type: "input_button/list" });

export const createInputButton = (
  hass: HomeAssistant,
  values: InputButtonMutableParams
) =>
  hass.callWS<InputButton>({
    type: "input_button/create",
    ...values,
  });

export const updateInputButton = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputButtonMutableParams>
) =>
  hass.callWS<InputButton>({
    type: "input_button/update",
    input_button_id: id,
    ...updates,
  });

export const deleteInputButton = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_button/delete",
    input_button_id: id,
  });
