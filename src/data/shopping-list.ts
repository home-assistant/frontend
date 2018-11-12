import { HomeAssistant } from "../types";

export interface ShoppingListItem {
  id: number;
  name: string;
  complete: boolean;
}

export const fetchItems = (hass: HomeAssistant): Promise<ShoppingListItem[]> =>
  hass.callWS({
    type: "shopping_list/items/get",
  });

export const saveEdit = (
  hass: HomeAssistant,
  itemId: number,
  name: string
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/update",
    item_id: itemId,
    name,
  });

export const completeItem = (
  hass: HomeAssistant,
  itemId: number,
  complete: boolean
): Promise<void> =>
  hass.callWS({
    type: "shopping_list/items/update",
    item_id: itemId,
    complete,
  });

export const clearItems = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "shopping_list/items/clear",
  });

export const addItem = (
  hass: HomeAssistant,
  name: string
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/add",
    name,
  });
