import { describe, expect, it } from "vitest";
import type { TodoItem, TodoItemStatus } from "../../src/data/todo";
import {
  findDuplicateTodoItems,
  getTodoSwipeAction,
} from "../../src/data/todo";

const ACTIVE = "needs_action" as TodoItemStatus;
const COMPLETED = "completed" as TodoItemStatus;

const item = (
  uid: string,
  summary: string,
  status: TodoItemStatus | null = ACTIVE
): TodoItem => ({ uid, summary, status });

describe("findDuplicateTodoItems", () => {
  it("returns nothing when all summaries are unique", () => {
    expect(
      findDuplicateTodoItems([item("1", "Milk"), item("2", "Bread")])
    ).toEqual([]);
  });

  it("ignores case and surrounding or repeated whitespace", () => {
    const items = [
      item("1", "Olive oil"),
      item("2", "  olive   OIL "),
      item("3", "Bread"),
    ];
    expect(findDuplicateTodoItems(items).map((i) => i.uid)).toEqual(["2"]);
  });

  it("keeps the active item when a duplicate is completed", () => {
    const items = [
      item("1", "Milk", COMPLETED),
      item("2", "Milk", ACTIVE),
      item("3", "milk", COMPLETED),
    ];
    expect(findDuplicateTodoItems(items).map((i) => i.uid)).toEqual(["1", "3"]);
  });

  it("keeps the first item when all duplicates are completed", () => {
    const items = [item("1", "Milk", COMPLETED), item("2", "Milk", COMPLETED)];
    expect(findDuplicateTodoItems(items).map((i) => i.uid)).toEqual(["2"]);
  });

  it("does not treat empty summaries as duplicates", () => {
    expect(findDuplicateTodoItems([item("1", " "), item("2", "")])).toEqual([]);
  });
});

describe("getTodoSwipeAction", () => {
  it("completes active items in both directions", () => {
    expect(getTodoSwipeAction(ACTIVE, "start", true)).toBe("complete");
    expect(getTodoSwipeAction(ACTIVE, "end", true)).toBe("complete");
    expect(getTodoSwipeAction(null, "end", true)).toBe("complete");
  });

  it("deletes completed items swiped toward the start", () => {
    expect(getTodoSwipeAction(COMPLETED, "start", true)).toBe("delete");
  });

  it("does nothing toward the start when deleting is not supported", () => {
    expect(getTodoSwipeAction(COMPLETED, "start", false)).toBeUndefined();
  });

  it("reactivates completed items swiped toward the end", () => {
    expect(getTodoSwipeAction(COMPLETED, "end", false)).toBe("uncomplete");
  });
});
