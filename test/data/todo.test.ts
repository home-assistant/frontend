import { describe, expect, it } from "vitest";
import type { TodoItem } from "../../src/data/todo";
import {
  TodoItemStatus,
  getCategoryOptions,
  groupItemsByCategory,
} from "../../src/data/todo";

const item = (uid: string, category?: string | null): TodoItem => ({
  uid,
  summary: uid,
  status: TodoItemStatus.NeedsAction,
  category,
});

const summarize = (groups: ReturnType<typeof groupItemsByCategory>) =>
  groups?.map((group) => [
    group.category,
    group.items.map((groupItem) => groupItem.uid),
  ]);

describe("groupItemsByCategory", () => {
  it("returns undefined when no item has a category", () => {
    expect(groupItemsByCategory([item("a"), item("b", null)])).toBeUndefined();
    expect(groupItemsByCategory([item("a")], true)).toBeUndefined();
  });

  it("sorts categories alphabetically and puts items without a category last", () => {
    const groups = groupItemsByCategory([
      item("soap"),
      item("croquettes", "Pets"),
      item("pasta", "Grocery"),
      item("apples", "Fresh produce"),
      item("rice", "Grocery"),
      item("bread", ""),
    ]);
    expect(summarize(groups)).toEqual([
      ["Fresh produce", ["apples"]],
      ["Grocery", ["pasta", "rice"]],
      ["Pets", ["croquettes"]],
      [null, ["soap", "bread"]],
    ]);
  });

  it("keeps the group without a category so items can be moved to it", () => {
    expect(summarize(groupItemsByCategory([item("pasta", "Grocery")]))).toEqual(
      [["Grocery", ["pasta"]]]
    );
    expect(
      summarize(groupItemsByCategory([item("pasta", "Grocery")], true))
    ).toEqual([
      ["Grocery", ["pasta"]],
      [null, []],
    ]);
  });
});

describe("getCategoryOptions", () => {
  it("merges categories, without duplicates or empty values, sorted", () => {
    expect(
      getCategoryOptions([
        "Pets",
        "Grocery",
        undefined,
        "",
        null,
        "Pets",
        "Fresh produce",
      ])
    ).toEqual(["Fresh produce", "Grocery", "Pets"]);
  });
});
