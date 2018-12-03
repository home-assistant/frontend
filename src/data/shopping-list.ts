import { HomeAssistant } from "../types";

export const SYSTEM_INBOX = "system-inbox";

export interface ShoppingListItem {
  list_id: string;
  id: string;
  name: string;
  complete: boolean;
}

export const fetchLists = (hass: HomeAssistant): Promise<ShoppingListItem[]> =>
  hass.callWS({
    type: "shopping_list/lists",
  });

export const fetchItems = (
  hass: HomeAssistant,
  listId: string
): Promise<ShoppingListItem[]> =>
  hass.callWS({
    type: "shopping_list/items",
    list_id: listId,
  });

export const updateItem = (
  hass: HomeAssistant,
  listId: string,
  itemId: string,
  item: {
    name?: string;
    complete?: boolean;
  }
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/update",
    list_id: listId,
    item_id: itemId,
    ...item,
  });

export const clearItems = (
  hass: HomeAssistant,
  listId: string
): Promise<void> =>
  hass.callWS({
    type: "shopping_list/items/clear",
    list_id: listId,
  });

export const addItem = (
  hass: HomeAssistant,
  listId: string,
  name: string
): Promise<ShoppingListItem> =>
  hass.callWS({
    type: "shopping_list/items/add",
    list_id: listId,
    name,
  });
