import type { Connection, HassEntities } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { stringCompare } from "../common/string/compare";
import type {
  HomeAssistant,
  HomeAssistantFormatters,
  ServiceCallResponse,
} from "../types";
import { UNAVAILABLE } from "./entity/entity";

export interface TodoList {
  entity_id: string;
  name: string;
}

export const enum TodoItemStatus {
  NeedsAction = "needs_action",
  Completed = "completed",
}

export enum TodoSortMode {
  NONE = "none",
  ALPHA_ASC = "alpha_asc",
  ALPHA_DESC = "alpha_desc",
  DUEDATE_ASC = "duedate_asc",
  DUEDATE_DESC = "duedate_desc",
}

export interface TodoItem {
  uid: string;
  summary: string;
  status: TodoItemStatus | null;
  description?: string | null;
  due?: string | null;
  completed?: string | null;
}

export enum TodoListEntityFeature {
  CREATE_TODO_ITEM = 1,
  DELETE_TODO_ITEM = 2,
  UPDATE_TODO_ITEM = 4,
  MOVE_TODO_ITEM = 8,
  SET_DUE_DATE_ON_ITEM = 16,
  SET_DUE_DATETIME_ON_ITEM = 32,
  SET_DESCRIPTION_ON_ITEM = 64,
}

export const getTodoLists = (
  states: HassEntities,
  entities: HomeAssistant["entities"],
  formatEntityName: HomeAssistantFormatters["formatEntityName"],
  language: string,
  includeHidden = true
): TodoList[] =>
  Object.keys(states)
    .filter(
      (entityId) =>
        computeDomain(entityId) === "todo" &&
        states[entityId].state !== UNAVAILABLE &&
        (includeHidden || entities[entityId]?.hidden !== true)
    )
    .map((entityId) => ({
      ...states[entityId],
      entity_id: entityId,
      name: formatEntityName(states[entityId]),
    }))
    .sort((a, b) => stringCompare(a.name, b.name, language));

export interface TodoItems {
  items: TodoItem[];
}

export const fetchItems = async (
  callWS: HomeAssistant["callWS"],
  entity_id: string
): Promise<TodoItem[]> => {
  const result = await callWS<TodoItems>({
    type: "todo/item/list",
    entity_id,
  });
  return result.items;
};

export const subscribeItems = (
  connection: Connection,
  entity_id: string,
  callback: (update: TodoItems) => void
) =>
  connection.subscribeMessage<TodoItems>(callback, {
    type: "todo/item/subscribe",
    entity_id,
  });

export const updateItem = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  item: TodoItem
): Promise<ServiceCallResponse> =>
  callService(
    "todo",
    "update_item",
    {
      item: item.uid,
      rename: item.summary,
      status: item.status,
      description: item.description,
      due_datetime: item.due?.includes("T") ? item.due : undefined,
      due_date:
        item.due === undefined || item.due?.includes("T")
          ? undefined
          : item.due,
    },
    { entity_id }
  );

export const createItem = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  item: Omit<TodoItem, "uid" | "status">
): Promise<ServiceCallResponse> =>
  callService(
    "todo",
    "add_item",
    {
      item: item.summary,
      description: item.description || undefined,
      due_datetime: item.due?.includes("T") ? item.due : undefined,
      due_date:
        item.due === undefined || item.due?.includes("T")
          ? undefined
          : item.due,
    },
    { entity_id }
  );

export const deleteItems = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  uids: string[]
): Promise<ServiceCallResponse> =>
  callService(
    "todo",
    "remove_item",
    {
      item: uids,
    },
    { entity_id }
  );

export const moveItem = (
  callWS: HomeAssistant["callWS"],
  entity_id: string,
  uid: string,
  previous_uid: string | undefined
): Promise<void> =>
  callWS({
    type: "todo/item/move",
    entity_id,
    uid,
    previous_uid,
  });
