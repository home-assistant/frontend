import { assert } from "chai";

import {
  fuzzyFilterSort,
  fuzzySequentialMatch,
  ScorableTextItem,
} from "../../../src/common/string/filter/sequence-matching";

type CreateExpectation = (
  pattern: string,
  expScore: number,
  expDecorated: string
) => {
  pattern: string;
  expected: {
    score: number;
    decoratedString: string;
  };
};
const createExpectation: CreateExpectation = (
  pattern,
  expScore,
  expDecorated
) => ({
  pattern,
  expected: {
    score: expScore,
    decoratedString: expDecorated,
  },
});

describe("fuzzySequentialMatch", () => {
  const item: ScorableTextItem = {
    strings: ["automation.ticker", "Stocks"],
  };

  const shouldMatchEntity = [
    createExpectation("automation.ticker", 131, "[automation.ticker]"),
    createExpectation("automation.ticke", 121, "[automation.ticke]r"),
    createExpectation("automation.", 82, "[automation.]ticker"),
    createExpectation("au", 10, "[au]tomation.ticker"),
    createExpectation("automationticker", 85, "[automation].[ticker]"),
    createExpectation("tion.tick", 8, "automa[tion.tick]er"),
    createExpectation("ticker", -4, "automation.[ticker]"),
    createExpectation("automation.r", 73, "[automation.]ticke[r]"),
    createExpectation("tick", -8, "automation.[tick]er"),
    createExpectation("aumatick", 9, "[au]to[ma]tion.[tick]er"),
    createExpectation("aion.tck", 4, "[a]utomat[ion.t]i[ck]er"),
    createExpectation("ioticker", -4, "automat[io]n.[ticker]"),
    createExpectation("atmto.ikr", -34, "[a]u[t]o[m]a[t]i[o]n[.]t[i]c[k]e[r]"),
    createExpectation("uoaintce", -39, "a[u]t[o]m[a]t[i]o[n].[t]i[c]k[e]r"),
    createExpectation("au.tce", -3, "[au]tomation[.t]i[c]k[e]r"),
    createExpectation("tomaontkr", -19, "au[toma]ti[on].[t]ic[k]e[r]"),
    createExpectation("s", 1, "[S]tocks"),
    createExpectation("stocks", 42, "[Stocks]"),
    createExpectation("sks", -5, "[S]toc[ks]"),
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
      it(`matches '${expectation.pattern}' with score of '${expectation.expected?.score}'`, () => {
        const res = fuzzySequentialMatch(expectation.pattern, item);
        assert.equal(res?.score, expectation.expected?.score);
      });

      it(`decorates '${expectation.pattern}' as '${expectation.expected?.decoratedString}'`, () => {
        const res = fuzzySequentialMatch(expectation.pattern, item);
        const allDecoratedStrings = [
          res!.decoratedStrings![0][0].join(""),
          res!.decoratedStrings![1][0].join(""),
        ];

        assert.includeDeepMembers(allDecoratedStrings, [
          expectation.expected!.decoratedString!,
        ]);
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
  const itemsBeforeFilter: ScorableTextItem[] = [
    automationTicker,
    sensorTicker,
    timerCheckRouter,
    ticker,
    badMatch,
  ];

  it(`filters and sorts correctly`, () => {
    const expectedItemsAfterFilter = [
      {
        ...ticker,
        score: 44,
        decoratedStrings: [["[ticker]"], ["Just [ticker]"]],
      },
      {
        ...sensorTicker,
        score: 1,
        decoratedStrings: [["sensor.[ticker]"], ["Stocks up"]],
      },
      {
        ...automationTicker,
        score: -4,
        decoratedStrings: [["automation.[ticker]"], ["Stocks"]],
      },
      {
        ...timerCheckRouter,
        score: -8,
        decoratedStrings: [
          ["automa[ti]on.[c]hec[k]_rout[er]"],
          ["[Ti]mer [C]hec[k] Rout[er]"],
        ],
      },
    ];

    const res = fuzzyFilterSort(filter, itemsBeforeFilter).map((item) => ({
      ...item,
      decoratedStrings: [
        [item.decoratedStrings![0][0].join("")],
        [item.decoratedStrings![1][0].join("")],
      ],
    }));

    assert.deepEqual(res, expectedItemsAfterFilter);
  });
});
