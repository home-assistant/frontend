import { HomeAssistant } from "../types";

export interface ShoppingListItem {
  id: number;
  name: string;
  complete: boolean;
}

export const fetchItems = (hass: HomeAssistant): Promise<ShoppingListItem[]> =>
  hass.callWS({
    type: "shopping_list/items",
  });

export const updateItem = (
  hass: HomeAssistant,
  itemId: number,
  item: {
    name?: string;
    complete?: boolean;
  }
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/update",
    item_id: itemId,
    ...item,
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

export const moveUpItem = (
  hass: HomeAssistant,
  itemId: string
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/move_up",
    item_id: itemId,
  });

export const moveDownItem = (
  hass: HomeAssistant,
  itemId: string
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/move_down",
    item_id: itemId,
  });
