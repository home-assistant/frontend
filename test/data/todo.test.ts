import { describe, expect, it } from "vitest";
import type { TodoItem } from "../../src/data/todo";
import { TodoItemStatus, groupItemsBySection } from "../../src/data/todo";

const item = (uid: string, section?: string | null): TodoItem => ({
  uid,
  summary: uid,
  status: TodoItemStatus.NeedsAction,
  section,
});

const summarize = (groups: ReturnType<typeof groupItemsBySection>) =>
  groups?.map((group) => [
    group.section,
    group.items.map((groupItem) => groupItem.uid),
  ]);

describe("groupItemsBySection", () => {
  it("returns undefined when no item has a section", () => {
    expect(
      groupItemsBySection([item("a"), item("b", null)], ["Grocery"])
    ).toBeUndefined();
  });

  it("orders groups like the sections of the list", () => {
    const groups = groupItemsBySection(
      [item("pasta", "Grocery"), item("apples", "Fresh produce")],
      ["Fresh produce", "Grocery"]
    );
    expect(summarize(groups)).toEqual([
      ["Fresh produce", ["apples"]],
      ["Grocery", ["pasta"]],
    ]);
  });

  it("puts unknown sections after known ones and items without a section last", () => {
    const groups = groupItemsBySection(
      [
        item("soap"),
        item("croquettes", "Pets"),
        item("pasta", "Grocery"),
        item("rice", "Grocery"),
        item("bread", ""),
      ],
      ["Fresh produce", "Grocery"]
    );
    expect(summarize(groups)).toEqual([
      ["Grocery", ["pasta", "rice"]],
      ["Pets", ["croquettes"]],
      [null, ["soap", "bread"]],
    ]);
  });
});
