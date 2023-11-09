import { HomeAssistant, ServiceCallResponse } from "../types";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { isUnavailableState } from "./entity";
import { stringCompare } from "../common/string/compare";

export interface TodoList {
  entity_id: string;
  name: string;
}

export const enum TodoItemStatus {
  NeedsAction = "needs_action",
  Completed = "completed",
}

export interface TodoItem {
  uid: string;
  summary: string;
  status: TodoItemStatus;
}

export const enum TodoListEntityFeature {
  CREATE_TODO_ITEM = 1,
  DELETE_TODO_ITEM = 2,
  UPDATE_TODO_ITEM = 4,
  MOVE_TODO_ITEM = 8,
}

export const getTodoLists = (hass: HomeAssistant): TodoList[] =>
  Object.keys(hass.states)
    .filter(
      (entityId) =>
        computeDomain(entityId) === "todo" &&
        !isUnavailableState(hass.states[entityId].state)
    )
    .map((entityId) => ({
      ...hass.states[entityId],
      entity_id: entityId,
      name: computeStateName(hass.states[entityId]),
    }))
    .sort((a, b) => stringCompare(a.name, b.name, hass.locale.language));

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
  entity_id: string,
  item: TodoItem
): Promise<ServiceCallResponse> =>
  hass.callService(
    "todo",
    "update_item",
    { item: item.uid, rename: item.summary, status: item.status },
    { entity_id }
  );

export const createItem = (
  hass: HomeAssistant,
  entity_id: string,
  summary: string
): Promise<ServiceCallResponse> =>
  hass.callService(
    "todo",
    "add_item",
    {
      item: summary,
    },
    { entity_id }
  );

export const deleteItem = (
  hass: HomeAssistant,
  entity_id: string,
  uid: string
): Promise<ServiceCallResponse> =>
  hass.callService(
    "todo",
    "remove_item",
    {
      item: uid,
    },
    { entity_id }
  );

export const moveItem = (
  hass: HomeAssistant,
  entity_id: string,
  uid: string,
  previous_uid: string | undefined
): Promise<void> =>
  hass.callWS({
    type: "todo/item/move",
    entity_id,
    uid,
    previous_uid,
  });
