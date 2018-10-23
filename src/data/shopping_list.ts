import { HomeAssistant } from "../types.js";

export const fetchItems = (hass: HomeAssistant) =>
    hass.callApi("GET", "shopping_list");

export const saveEdit = (
    hass: HomeAssistant,
    itemId: number,
    name: string,
) =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
      'name': name,
  });

export const completeItem = (
  hass: HomeAssistant,
  itemId: number,
  complete: boolean
) =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
    'complete': complete,
  });

export const addItem = (hass: HomeAssistant, name: string) =>
    hass.callApi("POST", "shopping_list/item", {
        'name': name,
    });

export const clearItems = (hass: HomeAssistant) =>
    hass.callApi("POST", "shopping_list/clear_completed");