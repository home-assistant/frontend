import { HomeAssistant } from "../types";
import { filter } from "minimatch";

export interface ToDoListItem {
  id?: string;
  name?: string;
  complete?: boolean;
}

export interface ToDoAPI {
  fetchItems(
    hass: HomeAssistant,
    listId: string,
    showCompleted: boolean
  ): Promise<ToDoListItem[]>;

  addItem(
    hass: HomeAssistant,
    listId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem>;

  updateItem(
    hass: HomeAssistant,
    listId: string,
    itemId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem>;

  clearItems(hass: HomeAssistant, listId: string): Promise<void>;
}

export class ShoppingListAPI implements ToDoAPI {
  public listIdRequired(): boolean {
    return false;
  }

  public fetchItems(
    hass: HomeAssistant,
    _listId: string,
    showCompleted: boolean
  ): Promise<ToDoListItem[]> {
    return hass
      .callWS({
        type: "shopping_list/items",
      })
      .then(
        (items: any): ToDoListItem[] => {
          return items.filter((item) => showCompleted || !item.complete);
        }
      );
  }

  public updateItem(
    hass: HomeAssistant,
    _listId: string,
    itemId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem> {
    return hass.callWS({
      type: "shopping_list/items/update",
      ...item,
      item_id: itemId,
    });
  }

  public clearItems(hass: HomeAssistant, _listId: string): Promise<void> {
    return hass.callWS({
      type: "shopping_list/items/clear",
    });
  }

  public addItem(
    hass: HomeAssistant,
    _listId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem> {
    return hass.callWS({
      type: "shopping_list/items/add",
      name: item.name,
    });
  }
}

export class WunderListAPI implements ToDoAPI {
  public listIdRequired(): boolean {
    return false;
  }

  public fetchItems(
    hass: HomeAssistant,
    listId: string,
    showCompleted: boolean
  ): Promise<ToDoListItem[]> {
    return hass
      .callWS({
        type: "wunderlist/tasks/list",
        list_id: listId,
        show_completed: showCompleted,
      })
      .then(
        (items: any): ToDoListItem[] => {
          return items.map(this.mapToToDoListItem);
        }
      );
  }

  public updateItem(
    hass: HomeAssistant,
    _listId: string,
    itemId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem> {
    const wlItem = this.mapToWunderListItem(item);
    return hass.callWS({
      type: "wunderlist/tasks/update",
      task_id: itemId,
      task: wlItem,
    });
  }

  public clearItems(hass: HomeAssistant): Promise<void> {
    throw new Error("Not yet implemented!");
  }

  public addItem(
    hass: HomeAssistant,
    listId: string,
    item: ToDoListItem
  ): Promise<ToDoListItem> {
    const wlItem = this.mapToWunderListItem(item);
    return hass.callWS({
      type: "wunderlist/tasks/add",
      list_id: listId,
      task: wlItem,
    });
  }

  private mapToToDoListItem(wlItem: any): ToDoListItem {
    return {
      name: wlItem.title,
      complete: wlItem.completed,
      id: wlItem.id,
    };
  }

  private mapToWunderListItem(tdItem: ToDoListItem): any {
    return {
      title: tdItem.name,
      completed: tdItem.complete,
      id: tdItem.id,
    };
  }
}

export function createToDoListAPI(provider: string) {
  if (provider === "shopping-list") {
    return new ShoppingListAPI();
  } else if (provider === "wunderlist") {
    return new WunderListAPI();
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}
