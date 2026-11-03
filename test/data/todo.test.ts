import { describe, expect, it } from "vitest";
import type { TodoItem } from "../../src/data/todo";
import {
  filterTodoItems,
  getTodoDueDate,
  TodoItemStatus,
} from "../../src/data/todo";

const ITEMS: TodoItem[] = [
  {
    uid: "apples",
    summary: "Buy apples",
    status: TodoItemStatus.NeedsAction,
    description: "Granny Smith from the market",
  },
  {
    uid: "etienne",
    summary: "Call Étienne",
    status: TodoItemStatus.NeedsAction,
    due: "2026-10-20",
  },
  {
    uid: "cafe",
    summary: "Café beans",
    status: TodoItemStatus.Completed,
  },
  {
    uid: "no-status",
    summary: "Buy stamps",
    status: null,
  },
];

const uids = (items: TodoItem[]) => items.map((item) => item.uid);

describe("filterTodoItems", () => {
  it("filters by status, treating a missing status as null", () => {
    expect(
      uids(filterTodoItems(ITEMS, { status: [TodoItemStatus.NeedsAction] }))
    ).toEqual(["apples", "etienne"]);
    expect(uids(filterTodoItems(ITEMS, { status: [null] }))).toEqual([
      "no-status",
    ]);
  });

  it("ignores an empty or whitespace-only search", () => {
    const status = [TodoItemStatus.NeedsAction];
    expect(filterTodoItems(ITEMS, { status, search: "" })).toHaveLength(2);
    expect(filterTodoItems(ITEMS, { status, search: "   " })).toHaveLength(2);
  });

  it.each([
    ["summary", "APPLES", "apples"],
    ["description", "granny", "apples"],
    ["accented item text", "etienne", "etienne"],
    ["accented search text", "  CAFÉ ", "cafe"],
  ])("matches on %s", (_name, search, uid) => {
    expect(
      uids(
        filterTodoItems(ITEMS, {
          status: [TodoItemStatus.NeedsAction, TodoItemStatus.Completed],
          search,
        })
      )
    ).toEqual([uid]);
  });

  it("requires every search word to match, in any order", () => {
    const status = [TodoItemStatus.NeedsAction, null];
    expect(
      uids(filterTodoItems(ITEMS, { status, search: "market buy" }))
    ).toEqual(["apples"]);
    expect(
      filterTodoItems(ITEMS, { status, search: "buy pears" })
    ).toHaveLength(0);
  });

  it("combines search with the due date filter", () => {
    const status = [TodoItemStatus.NeedsAction];
    expect(
      filterTodoItems(ITEMS, {
        status,
        search: "call",
        endDate: new Date("2026-10-15T00:00:00"),
      })
    ).toHaveLength(0);
    expect(
      uids(
        filterTodoItems(ITEMS, {
          status,
          search: "call",
          endDate: new Date("2026-10-25T00:00:00"),
        })
      )
    ).toEqual(["etienne"]);
  });

  it("keeps items due later the same day when filtering by end of day", () => {
    expect(
      uids(
        filterTodoItems(ITEMS, {
          status: [TodoItemStatus.NeedsAction],
          endDate: new Date("2026-10-20T23:59:59.999"),
        })
      )
    ).toEqual(["etienne"]);
  });
});

describe("getTodoDueDate", () => {
  it("treats a date without a time as due at the end of that day", () => {
    const date = getTodoDueDate(ITEMS[1]);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(20);
    expect(date?.getHours()).toBe(23);
    expect(date?.getMinutes()).toBe(59);
  });

  it("returns undefined when there is no due date", () => {
    expect(getTodoDueDate(ITEMS[0])).toBeUndefined();
    expect(getTodoDueDate({ ...ITEMS[0], due: "" })).toBeUndefined();
  });
});
