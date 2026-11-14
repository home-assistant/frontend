import { describe, expect, it } from "vitest";
import { decideColumns } from "../../../../src/panels/lovelace/views/masonry-columns";

// The masonry view adds cards only after decideColumns returns. A decision
// that comes too early lets column widths change while cards are shown; one
// that never comes leaves the view empty.
describe("decideColumns", () => {
  it("never decides differently than with all sizes known", () => {
    // Every combination of a few cards, sizes, hidden cards and unknown
    // sizes: an early decision must be the final one, and with all sizes
    // known there must be a decision.
    const values = [0, 1, 3, 5, NaN];
    const failures: string[] = [];
    for (let cards = 1; cards <= 4; cards++) {
      const combinations = values.length ** cards;
      for (let combination = 0; combination < combinations; combination++) {
        const sizes = Array.from(
          { length: cards },
          (_size, index) =>
            values[
              Math.floor(combination / values.length ** index) % values.length
            ]
        );
        for (let hidden = 0; hidden < 2 ** cards; hidden++) {
          const shown = sizes.map(
            (_size, index) => Math.floor(hidden / 2 ** index) % 2 === 0
          );
          for (let columns = 1; columns <= cards; columns++) {
            const final = decideColumns(sizes, shown, columns);
            if (!final) {
              failures.push(`no decision for ${sizes} ${shown} ${columns}`);
              continue;
            }
            for (let unknown = 1; unknown < 2 ** cards; unknown++) {
              const partial = sizes.map((size, index) =>
                Math.floor(unknown / 2 ** index) % 2 ? undefined : size
              );
              const early = decideColumns(partial, shown, columns);
              if (early && JSON.stringify(early) !== JSON.stringify(final)) {
                failures.push(`${partial} ${shown} ${columns}`);
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("adds only the columns that are used when all sizes are known", () => {
    expect(decideColumns([1, 1, 1], [true, true, true], 3)).toEqual({
      count: 1,
      held: [],
    });
  });

  it("does not hold a column that only gets hidden cards", () => {
    expect(decideColumns([5, 5, 5], [true, false, true], 3)).toEqual({
      count: 3,
      held: [0, 2],
    });
  });

  it("waits while a column only has a hidden card", () => {
    // A later card could make the second column shown
    expect(
      decideColumns([5, 5, 5, 1, undefined], [true, false, true, true, true], 3)
    ).toBeUndefined();
  });

  it("decides early when the cards reach the last column with unknown sizes as 0", () => {
    expect(
      decideColumns([undefined, 3, 3, 3], [true, true, true, true], 2)
    ).toEqual({ count: 2, held: [0, 1] });
  });

  it("waits while the number of columns depends on an unknown size", () => {
    // With a size of 1 or more, the third card would go to the second
    // column. With 0, all cards fit in the first column.
    expect(decideColumns([4, undefined, 1], [true, true, true], 2)).toBe(
      undefined
    );
  });

  it("decides early when fewer columns are certain", () => {
    // Whatever the third size, every card stays in the first column
    expect(decideColumns([1, 1, undefined], [true, true, true], 3)).toEqual({
      count: 1,
      held: [],
    });
  });

  it("decides early when a hidden card cannot be the first of a column", () => {
    // The second column starts with the second, third or fourth card
    expect(
      decideColumns([undefined, 3, 3, 3, 3], [true, true, true, true, false], 2)
    ).toEqual({ count: 2, held: [0, 1] });
  });

  it("waits while a hidden card can be the first of a column", () => {
    expect(
      decideColumns([undefined, 3, 3, 3], [true, true, false, true], 2)
    ).toBeUndefined();
  });

  it("treats missing sizes as unknown", () => {
    // The view starts with an empty array of sizes
    expect(decideColumns(new Array(4), [true, true, true, true], 2)).toBe(
      undefined
    );
  });

  it("decides at once with no cards or one column", () => {
    expect(decideColumns([], [], 0)).toEqual({ count: 0, held: [] });
    expect(decideColumns([undefined, undefined], [true, true], 1)).toEqual({
      count: 1,
      held: [],
    });
  });
});
