import { endOfDay } from "date-fns";
import { computeDomain } from "../common/entity/compute_domain";
import { stringCompare } from "../common/string/compare";
import { stripDiacritics } from "../common/string/strip-diacritics";
import type { HomeAssistant, ServiceCallResponse } from "../types";
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
  hass: HomeAssistant,
  includeHidden = true
): TodoList[] =>
  Object.keys(hass.states)
    .filter(
      (entityId) =>
        computeDomain(entityId) === "todo" &&
        hass.states[entityId].state !== UNAVAILABLE &&
        (includeHidden || hass.entities[entityId]?.hidden !== true)
    )
    .map((entityId) => ({
      ...hass.states[entityId],
      entity_id: entityId,
      name: hass.formatEntityName(hass.states[entityId]),
    }))
    .sort((a, b) => stringCompare(a.name, b.name, hass.locale.language));

export const getTodoDueDate = (item: TodoItem): Date | undefined =>
  item.due
    ? item.due.includes("T")
      ? new Date(item.due)
      : endOfDay(new Date(`${item.due}T00:00:00`))
    : undefined;

export interface TodoItemsFilter {
  status: (TodoItemStatus | null)[];
  /** Only keep items that are due on or before this date. */
  endDate?: Date;
  /** Every word must appear in the summary or description. */
  search?: string;
}

export const filterTodoItems = (
  items: TodoItem[],
  { status, endDate, search }: TodoItemsFilter
): TodoItem[] => {
  const terms = search
    ? stripDiacritics(search.toLowerCase()).split(/\s+/).filter(Boolean)
    : [];

  return items.filter((item) => {
    if (!status.includes(item.status || null)) {
      return false;
    }
    if (terms.length) {
      const searchString = stripDiacritics(
        `${item.summary ?? ""} ${item.description ?? ""}`.toLowerCase()
      );
      if (!terms.every((term) => searchString.includes(term))) {
        return false;
      }
    }
    if (!endDate) {
      return true;
    }
    const dueDate = getTodoDueDate(item);
    return dueDate !== undefined && dueDate <= endDate;
  });
};

export interface TodoItems {
  items: TodoItem[];
}

export const fetchItems = async (
  hass: HomeAssistant,
  entity_id: string
): Promise<TodoItem[]> => {
  const result = await hass.callWS<TodoItems>({
    type: "todo/item/list",
    entity_id,
  });
  return result.items;
};

export const subscribeItems = (
  hass: HomeAssistant,
  entity_id: string,
  callback: (update: TodoItems) => void
) =>
  hass.connection.subscribeMessage<TodoItems>(callback, {
    type: "todo/item/subscribe",
    entity_id,
  });

export const updateItem = (
  hass: HomeAssistant,
  entity_id: string,
  item: TodoItem
): Promise<ServiceCallResponse> =>
  hass.callService(
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
  hass: HomeAssistant,
  entity_id: string,
  item: Omit<TodoItem, "uid" | "status">
): Promise<ServiceCallResponse> =>
  hass.callService(
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
  hass: HomeAssistant,
  entity_id: string,
  uids: string[]
): Promise<ServiceCallResponse> =>
  hass.callService(
    "todo",
    "remove_item",
    {
      item: uids,
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
