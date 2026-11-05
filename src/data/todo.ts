import type {
  Connection,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
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
  section?: string | null;
}

export interface TodoItemSectionGroup {
  section: string | null;
  items: TodoItem[];
}

export enum TodoListEntityFeature {
  CREATE_TODO_ITEM = 1,
  DELETE_TODO_ITEM = 2,
  UPDATE_TODO_ITEM = 4,
  MOVE_TODO_ITEM = 8,
  SET_DUE_DATE_ON_ITEM = 16,
  SET_DUE_DATETIME_ON_ITEM = 32,
  SET_DESCRIPTION_ON_ITEM = 64,
  SET_SECTION_ON_ITEM = 128,
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
      section: item.section,
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
      section: item.section || undefined,
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

export const getTodoSections = (
  stateObj: HassEntity | undefined
): string[] | undefined => stateObj?.attributes.sections;

/**
 * Group items by section, in the order of the sections of the list.
 *
 * Sections that are not in `sections` follow in order of appearance, and items
 * without a section come last. Returns undefined when no item has a section.
 * With `includeEmpty`, every section and the group of items without a section
 * are returned even when they have no items, so items can be moved to them.
 */
export const groupItemsBySection = (
  items: TodoItem[],
  sections: string[] = [],
  includeEmpty = false
): TodoItemSectionGroup[] | undefined => {
  if (
    !items.some((item) => item.section) &&
    !(includeEmpty && sections.length)
  ) {
    return undefined;
  }
  const groups = new Map<string | null, TodoItem[]>(
    sections.map((section) => [section, []])
  );
  const withoutSection: TodoItem[] = [];
  for (const item of items) {
    if (!item.section) {
      withoutSection.push(item);
      continue;
    }
    const group = groups.get(item.section);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.section, [item]);
    }
  }
  groups.set(null, withoutSection);
  return Array.from(groups, ([section, groupItems]) => ({
    section,
    items: groupItems,
  })).filter((group) => includeEmpty || group.items.length);
};
