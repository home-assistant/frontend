import { assert } from "chai";

import {
  fuzzySequentialMatch,
  findLongestSubstring,
} from "../../../src/common/string/sequence_matching";

describe("fuzzySequentialMatch", () => {
  const entityId = "automation.ticker";

  const shouldMatchEntity = {
    0: ["automation.ticker", "automation.ticke", "automation.", "au", ""],
    1: ["automationticker", "tion.tick", "ticker", "automation.r", "tick"],
    2: ["aumatick", "aion.tck", "ioticker"],
    100: ["atmto.ikr", "uoaintce", "au.tce", "tomaontkr"],
  };

  describe(`Entity '${entityId}'`, () => {
    let skipsToTest: number[] = Object.keys(shouldMatchEntity).map(Number);

    for (const maxSkips of skipsToTest) {
      describe(`with ${maxSkips} allowed skips`, () => {
        const goodFilters = shouldMatchEntity[maxSkips];

        for (const i in goodFilters) {
          const goodFilter = goodFilters[i];

          it(`matches with '${goodFilter}'`, () => {
            const res = fuzzySequentialMatch(goodFilter, entityId, maxSkips);
            assert.equal(res, true);
          });
        }

        const badFilters =
          maxSkips === skipsToTest[skipsToTest.length - 1]
            ? []
            : shouldMatchEntity[maxSkips + 1];

        if (badFilters && badFilters.length > 0) {
          for (const i in badFilters) {
            const badFilter = badFilters[i];

            it(`fails to match with '${badFilter}'`, () => {
              const res = fuzzySequentialMatch(badFilter, entityId, maxSkips);
              assert.equal(res, false);
            });
          }
        }
      });
    }

    describe("When a shorter matching path is found", () => {
      // Can match "automation.ticker" using either
      //           "a-t----ion.tick--" (using 2 skips)
      //           "-----ation.tick--" (using 1 skip)
      const filter = "ation.tick";

      it(`matches with '${filter}' and 1 skip`, () => {
        const res = fuzzySequentialMatch(filter, entityId, 1);
        assert.equal(res, true);
      });

      it(`matches with '${filter}' and 2 skips`, () => {
        const res = fuzzySequentialMatch(filter, entityId, 2);
        assert.equal(res, true);
      });
    });
  });

  describe("with only one skip allowed", () => {
    const filter = "auto.er";

    describe("without immunity", () => {
      it(`fails with '${filter}'`, () => {
        const res = fuzzySequentialMatch(filter, entityId, 1);
        assert.equal(res, false);
      });
    });

    describe("with immunity", () => {
      it(`matches with '${filter}'`, () => {
        const res = fuzzySequentialMatch(filter, entityId, 1, ["."]);
        assert.equal(res, true);
      });
    });
  });
});

describe("findLongestSubstring", () => {
  it("For a full substring match", () => {
    assert.strictEqual(
      findLongestSubstring("automation.ticker", "automation.ticker"),
      0
    );

    assert.strictEqual(
      findLongestSubstring("automation.ti", "automation.ticker"),
      0
    );
  });

  it("For a full substring match at the end", () => {
    assert.strictEqual(findLongestSubstring("ticker", "automation.ticker"), 11);
  });

  it("For a full substring match in middle", () => {
    assert.strictEqual(
      findLongestSubstring("tion.tick", "automation.ticker"),
      6
    );
  });

  it("For a partial substring match", () => {
    assert.strictEqual(
      findLongestSubstring("toticker", "automation.ticker"),
      2
    );
  });

  it("For a filter that doesn't have a match", () => {
    assert.strictEqual(findLongestSubstring("x", "automation.ticker"), -1);
  });
});
