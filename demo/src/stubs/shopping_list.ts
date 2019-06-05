import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { ShoppingListItem } from "../../../src/data/shopping-list";

let items: ShoppingListItem[] = [
  {
    id: 12,
    name: "Milk",
    complete: false,
  },
  {
    id: 13,
    name: "Eggs",
    complete: false,
  },
  {
    id: 14,
    name: "Oranges",
    complete: true,
  },
];

export const mockShoppingList = (hass: MockHomeAssistant) => {
  hass.mockWS("shopping_list/items", () => items);
  hass.mockWS("shopping_list/items/add", (msg) => {
    const item: ShoppingListItem = {
      id: new Date().getTime(),
      complete: false,
      name: msg.name,
    };
    items.push(item);
    hass.mockEvent("shopping_list_updated");
    return item;
  });
  hass.mockWS("shopping_list/items/update", ({ type, item_id, ...updates }) => {
    items = items.map((item) =>
      item.id === item_id ? { ...item, ...updates } : item
    );
    hass.mockEvent("shopping_list_updated");
  });
  hass.mockWS("shopping_list/items/clear", () => {
    items = items.filter((item) => !item.complete);
    hass.mockEvent("shopping_list_updated");
  });
};
