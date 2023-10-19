import { HomeAssistant, ServiceCallResponse } from "../types";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { isUnavailableState } from "./entity";

export enum TodoItemStatus {
  NeedsAction = "needs-action",
  Completed = "completed",
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
  MOVE_TODO_ITEM = 8,
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
      ...hass.states[entityId],
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
  entity_id: string,
  item: TodoItem
): Promise<ServiceCallResponse> =>
  hass.callService("todo", "update_item", item, { entity_id });

export const createItem = (
  hass: HomeAssistant,
  entity_id: string,
  summary: string
): Promise<ServiceCallResponse> =>
  hass.callService(
    "todo",
    "create_item",
    {
      summary,
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
    "delete_item",
    {
      uid,
    },
    { entity_id }
  );

export const moveItem = (
  hass: HomeAssistant,
  entity_id: string,
  uid: string,
  pos: number
): Promise<void> =>
  hass.callWS({
    type: "todo/item/move",
    entity_id,
    uid,
    pos,
  });
