import { assert } from "chai";

import {
  fuzzyFilterSort,
  fuzzySequentialMatch,
} from "../../../src/common/string/filter/sequence-matching";

describe("fuzzySequentialMatch", () => {
  const entity = { entity_id: "automation.ticker", friendly_name: "Stocks" };

  const createExpectation: (
    pattern,
    expected
  ) => {
    pattern: string;
    expected: string | number | undefined;
  } = (pattern, expected) => ({
    pattern,
    expected,
  });

  const shouldMatchEntity = [
    createExpectation("automation.ticker", 131),
    createExpectation("automation.ticke", 121),
    createExpectation("automation.", 82),
    createExpectation("au", 10),
    createExpectation("automationticker", 85),
    createExpectation("tion.tick", 8),
    createExpectation("ticker", -4),
    createExpectation("automation.r", 73),
    createExpectation("tick", -8),
    createExpectation("aumatick", 9),
    createExpectation("aion.tck", 4),
    createExpectation("ioticker", -4),
    createExpectation("atmto.ikr", -34),
    createExpectation("uoaintce", -39),
    createExpectation("au.tce", -3),
    createExpectation("tomaontkr", -19),
    createExpectation("s", 1),
    createExpectation("stocks", 42),
    createExpectation("sks", -5),
  ];

  const shouldNotMatchEntity = [
    "",
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
    for (const expectation of shouldMatchEntity) {
      it(`matches '${expectation.pattern}' with return of '${expectation.expected}'`, () => {
        const res = fuzzySequentialMatch(
          expectation.pattern,
          entity.entity_id,
          entity.friendly_name
        );
        assert.equal(res, expectation.expected);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySequentialMatch(
          badFilter,
          entity.entity_id,
          entity.friendly_name
        );
        assert.equal(res, undefined);
      });
    }
  });
});

describe("fuzzyFilterSort", () => {
  const filter = "ticker";
  const automationTicker = {
    filterText: "automation.ticker",
    altText: "Stocks",
    score: 0,
  };
  const ticker = {
    filterText: "ticker",
    altText: "Just ticker",
    score: 0,
  };
  const sensorTicker = {
    filterText: "sensor.ticker",
    altText: "Stocks up",
    score: 0,
  };
  const timerCheckRouter = {
    filterText: "automation.check_router",
    altText: "Timer Check Router",
    score: 0,
  };
  const badMatch = {
    filterText: "light.chandelier",
    altText: "Chandelier",
    score: 0,
  };
  const itemsBeforeFilter = [
    automationTicker,
    sensorTicker,
    timerCheckRouter,
    ticker,
    badMatch,
  ];

  it(`filters and sorts correctly`, () => {
    const expectedItemsAfterFilter = [
      { ...ticker, score: 44 },
      { ...sensorTicker, score: 1 },
      { ...automationTicker, score: -4 },
      { ...timerCheckRouter, score: -8 },
    ];

    const res = fuzzyFilterSort(filter, itemsBeforeFilter);

    assert.deepEqual(res, expectedItemsAfterFilter);
  });
});
