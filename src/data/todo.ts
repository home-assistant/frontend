import { HomeAssistant } from "../types";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { isUnavailableState } from "./entity";
import { string } from "superstruct";

export enum TodoItemStatus {
  NeedsAction = "NEEDS-ACTION",
  Completed = "COMPLETED",
}

export interface TodoList {
  entity_id: string;
  name: string;
}

export interface TodoItem {
  uid?: string;
  summary: string;
  status: TodoItemStatus;
}

export const enum TodoListEntityFeature {
  CREATE_TODO_ITEM = 1,
  DELETE_TODO_ITEM = 2,
  UPDATE_TODO_ITEM = 4,
}

export const getTodoLists = (hass: HomeAssistant): TodoList[] =>
  Object.keys(hass.states)
    .filter(
      (entityId) =>
        computeDomain(entityId) === "todo" &&
        !isUnavailableState(hass.states[entityId].state)
    )
    .sort()
    .map((entityId) => ({
      entity_id: entityId,
      name: computeStateName(hass.states[entityId]),
    }));

export interface TodoItems {
  items: TodoItem[];
}

export const fetchItems = async (
  hass: HomeAssistant,
  entityId: string
): Promise<TodoItem[]> => {
  const result = await hass.callWS<TodoItems>({
    type: "todo/item/list",
    entity_id: entityId,
  });
  return result.items;
};

export const updateItem = (
  hass: HomeAssistant,
  entityId: string,
  item: TodoItem
): Promise<void> =>
  hass.callWS({
    type: "todo/item/update",
    entity_id: entityId,
    item: item,
  });

export const createItem = (
  hass: HomeAssistant,
  entityId: string,
  summary: string
): Promise<void> =>
  hass.callWS({
    type: "todo/item/create",
    entity_id: entityId,
    item: { summary: summary },
  });

export const deleteItems = (
  hass: HomeAssistant,
  entityId: string,
  uids: Array<string>
): Promise<void> =>
  hass.callWS({
    type: "todo/item/delete",
    entity_id: entityId,
    uids: uids,
  });

export const moveItem = (
  hass: HomeAssistant,
  entityId: string,
  uid: string,
  previous: string
): Promise<void> =>
  hass.callWS({
    type: "todo/item/move",
    entity_id: entityId,
    uid: uid,
    previous: previous,
  });
