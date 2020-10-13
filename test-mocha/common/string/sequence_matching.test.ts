import { assert } from "chai";

import { fuzzySequentialMatch } from "../../../src/common/string/sequence_matching";

describe("fuzzySequentialMatch", () => {
  const entityId = "automation.ticker";

  const shouldMatchEntity = [
    "",
    "automation.ticker",
    "automation.ticke",
    "automation.",
    "au",
    "automationticker",
    "tion.tick",
    "ticker",
    "automation.r",
    "tick",
    "aumatick",
    "aion.tck",
    "ioticker",
    "atmto.ikr",
    "uoaintce",
    "au.tce",
    "tomaontkr",
  ];

  const shouldNotMatchEntity = [
    " ",
    "abcdefghijklmnopqrstuvwxyz",
    "automation.tickerz",
    "automation. ticke",
    "1",
    "noitamotua",
  ];

  describe(`Entity '${entityId}'`, () => {
    for (const goodFilter of shouldMatchEntity) {
      it(`matches with '${goodFilter}'`, () => {
        const res = fuzzySequentialMatch(goodFilter, entityId);
        assert.equal(res, true);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySequentialMatch(badFilter, entityId);
        assert.equal(res, false);
      });
    }
  });
});
