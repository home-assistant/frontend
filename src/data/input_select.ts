import { HomeAssistant } from "../types";

export interface InputSelect {
  id: string;
  name: string;
  options: string[];
  icon?: string;
  initial?: string;
}

export interface InputSelectMutableParams {
  name: string;
  icon: string;
  initial: string;
  options: string[];
}

export const setInputSelectOption = (
  hass: HomeAssistant,
  entity: string,
  option: string
) =>
  hass.callService("input_select", "select_option", {
    option,
    entity_id: entity,
  });

export const fetchInputSelect = (hass: HomeAssistant) =>
  hass.callWS<InputSelect[]>({ type: "input_select/list" });

export const createInputSelect = (
  hass: HomeAssistant,
  values: InputSelectMutableParams
) =>
  hass.callWS<InputSelect>({
    type: "input_select/create",
    ...values,
  });

export const updateInputSelect = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<InputSelectMutableParams>
) =>
  hass.callWS<InputSelect>({
    type: "input_select/update",
    input_select_id: id,
    ...updates,
  });

export const deleteInputSelect = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "input_select/delete",
    input_select_id: id,
  });
