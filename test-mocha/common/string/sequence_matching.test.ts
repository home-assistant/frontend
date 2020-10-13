import { assert } from "chai";

import { fuzzySequentialMatch } from "../../../src/common/string/sequence_matching";

describe("fuzzySequentialMatch", () => {
  const entity = { entity_id: "automation.ticker", friendly_name: "Stocks" };

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
    "s",
    "stocks",
    "sks",
  ];

  const shouldNotMatchEntity = [
    " ",
    "abcdefghijklmnopqrstuvwxyz",
    "automation.tickerz",
    "automation. ticke",
    "1",
    "noitamotua",
    "autostocks",
    "stox",
  ];

  describe(`Entity '${entity.entity_id}'`, () => {
    for (const goodFilter of shouldMatchEntity) {
      it(`matches with '${goodFilter}'`, () => {
        const res = fuzzySequentialMatch(goodFilter, [
          entity.entity_id,
          entity.friendly_name.toLowerCase(),
        ]);
        assert.equal(res, true);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySequentialMatch(badFilter, [
          entity.entity_id,
          entity.friendly_name,
        ]);
        assert.equal(res, false);
      });
    }
  });
});
