import { HomeAssistant } from "../types";

export interface ShoppingListItem {
  id: number;
  name: string;
  complete: boolean;
}

export const fetchItems = (hass: HomeAssistant): Promise<ShoppingListItem[]> =>
  hass.callApi("GET", "shopping_list");

export const saveEdit = (
  hass: HomeAssistant,
  itemId: number,
  name: string
): Promise<ShoppingListItem> =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
    name,
  });

export const completeItem = (
  hass: HomeAssistant,
  itemId: number,
  complete: boolean
): Promise<void> =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
    complete,
  });

export const clearItems = (hass: HomeAssistant): Promise<void> =>
  hass.callApi("POST", "shopping_list/clear_completed");
