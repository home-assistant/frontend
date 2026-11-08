import { describe, expect, it } from "vitest";
import type { TodoItem } from "../../src/data/todo";
import { TodoItemStatus, groupItemsByCategory } from "../../src/data/todo";

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
    expect(
      groupItemsByCategory([item("a"), item("b", null)], ["Grocery"])
    ).toBeUndefined();
  });

  it("sorts categories alphabetically and puts items without a category last", () => {
    const groups = groupItemsByCategory(
      [
        item("soap"),
        item("croquettes", "Pets"),
        item("pasta", "Grocery"),
        item("apples", "Fresh produce"),
        item("rice", "Grocery"),
        item("bread", ""),
      ],
      ["Pets", "Grocery", "Fresh produce"]
    );
    expect(summarize(groups)).toEqual([
      ["Fresh produce", ["apples"]],
      ["Grocery", ["pasta", "rice"]],
      ["Pets", ["croquettes"]],
      [null, ["soap", "bread"]],
    ]);
  });

  it("includes categories that are not offered by the list", () => {
    const groups = groupItemsByCategory(
      [item("pasta", "Grocery"), item("croquettes", "Pets")],
      ["Grocery"]
    );
    expect(summarize(groups)).toEqual([
      ["Grocery", ["pasta"]],
      ["Pets", ["croquettes"]],
    ]);
  });

  it("keeps empty groups so items can be moved to them", () => {
    expect(
      summarize(
        groupItemsByCategory(
          [item("pasta", "Grocery")],
          ["Grocery", "Fresh produce"],
          true
        )
      )
    ).toEqual([
      ["Fresh produce", []],
      ["Grocery", ["pasta"]],
      [null, []],
    ]);
    expect(
      summarize(groupItemsByCategory([item("soap")], ["Fresh produce"], true))
    ).toEqual([
      ["Fresh produce", []],
      [null, ["soap"]],
    ]);
    expect(groupItemsByCategory([item("soap")], [], true)).toBeUndefined();
  });
});
