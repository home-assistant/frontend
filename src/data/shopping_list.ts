import { HomeAssistant } from "../types.js";
import { ShoppingListItem } from "../panels/lovelace/cards/hui-shopping-list-card.js";

export const fetchItems = (hass: HomeAssistant): Promise<ShoppingListItem[]> =>
  hass.callApi("GET", "shopping_list");

export const saveEdit = (
  hass: HomeAssistant,
  itemId: number,
  name: string
): Promise<{}> =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
    name,
  });

export const completeItem = (
  hass: HomeAssistant,
  itemId: number,
  complete: boolean
): Promise<{}> =>
  hass.callApi("POST", "shopping_list/item/" + itemId, {
    complete,
  });

export const addItem = (hass: HomeAssistant, name: string): Promise<{}> =>
  hass.callApi("POST", "shopping_list/item", {
    name,
  });

export const clearItems = (hass: HomeAssistant): Promise<{}> =>
  hass.callApi("POST", "shopping_list/clear_completed");

export const deleteItem = (hass: HomeAssistant, itemId: number): Promise<{}> =>
  hass.callApi("GET", "shopping_list/delete/" + itemId);
