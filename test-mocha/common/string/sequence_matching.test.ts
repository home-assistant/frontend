import { assert } from "chai";

import { fuzzySequentialMatchBasic } from "../../../src/common/string/filter/sequence-matching";

describe("fuzzySequentialMatchBasic", () => {
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
        const res = fuzzySequentialMatchBasic(goodFilter, [
          entity.entity_id,
          entity.friendly_name.toLowerCase(),
        ]);
        assert.equal(res, true);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySequentialMatchBasic(badFilter, [
          entity.entity_id,
          entity.friendly_name,
        ]);
        assert.equal(res, false);
      });
    }
  });
});
