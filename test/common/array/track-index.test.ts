import { describe, expect, it } from "vitest";
import {
  indexAfterMove,
  indexAfterRemove,
} from "../../../src/common/array/track-index";

// Moves an item with splice, like the lists do, to compare against.
const move = <T>(items: T[], oldIndex: number, newIndex: number): T[] => {
  const result = items.concat();
  result.splice(newIndex, 0, result.splice(oldIndex, 1)[0]);
  return result;
};

describe("indexAfterMove", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("follows the item through every possible move", () => {
    for (let index = 0; index < items.length; index++) {
      for (let oldIndex = 0; oldIndex < items.length; oldIndex++) {
        for (let newIndex = 0; newIndex < items.length; newIndex++) {
          const moved = move(items, oldIndex, newIndex);
          expect(moved[indexAfterMove(index, oldIndex, newIndex)]).toBe(
            items[index]
          );
        }
      }
    }
  });
});

describe("indexAfterRemove", () => {
  it("follows the item when another one is removed", () => {
    expect(indexAfterRemove(3, 1)).toBe(2);
    expect(indexAfterRemove(1, 3)).toBe(1);
  });

  it("returns undefined when the item itself is removed", () => {
    expect(indexAfterRemove(2, 2)).toBeUndefined();
  });
});
