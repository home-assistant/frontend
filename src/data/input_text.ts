import { HomeAssistant } from "../types";

export interface InputText {
  id: string;
  name: string;
  icon?: string;
  initial?: string;
  min?: number;
  max?: number;
  pattern?: string;
  mode?: "text" | "password";
}

export interface InputTextMutableParams {
  name: string;
  icon: string;
  initial: string;
  min: number;
  max: number;
  pattern: string;
  mode: "text" | "password";
}

export const setValue = (hass: HomeAssistant, entity: string, value: string) =>
  hass.callService(entity.split(".", 1)[0], "set_value", {
    value,
    entity_id: entity,
  });

export const fetchInputText = (hass: HomeAssistant) =>
  hass.callWS<InputText[]>({ type: "input_text/list" });

export const createInputText = (
  hass: HomeAssistant,
  values: InputTextMutableParams
) =>
  hass.callWS<InputText>({
    type: "input_text/create",
    ...values,
  });

export const updateInputText = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputTextMutableParams>
) =>
  hass.callWS<InputText>({
    type: "input_text/update",
    input_text_id: id,
    ...updates,
  });

export const deleteInputText = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_text/delete",
    input_text_id: id,
  });
