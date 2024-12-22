import { assert } from "chai";

import {
  fuzzyFilterSort,
  fuzzySequentialMatch,
  ScorableTextItem,
} from "../../../src/common/string/filter/sequence-matching";

describe("fuzzySequentialMatch", () => {
  const item: ScorableTextItem = {
    strings: ["automation.ticker", "Stocks"],
  };

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

  describe(`Entity '${item.strings[0]}'`, () => {
    for (const expectation of shouldMatchEntity) {
      it(`matches '${expectation.pattern}' with return of '${expectation.expected}'`, () => {
        const res = fuzzySequentialMatch(expectation.pattern, item);
        assert.equal(res, expectation.expected);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySequentialMatch(badFilter, item);
        assert.equal(res, undefined);
      });
    }
  });
});

describe("fuzzyFilterSort", () => {
  const filter = "ticker";
  const automationTicker = {
    strings: ["automation.ticker", "Stocks"],
    score: 0,
  };
  const ticker = {
    strings: ["ticker", "Just ticker"],
    score: 0,
  };
  const sensorTicker = {
    strings: ["sensor.ticker", "Stocks up"],
    score: 0,
  };
  const timerCheckRouter = {
    strings: ["automation.check_router", "Timer Check Router"],
    score: 0,
  };
  const badMatch = {
    strings: ["light.chandelier", "Chandelier"],
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
