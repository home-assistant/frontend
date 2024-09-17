import { assert } from "chai";

import {
  fuzzyFilterSort,
  fuzzySequentialMatch,
  MatchToken,
  ScorableTextItem,
  tokenizeConcatenatedMatchInfo,
  tokenizeMatchInfo,
} from "../../../src/common/string/filter/sequence-matching";

describe("fuzzySequentialMatch", () => {
  const item: ScorableTextItem = {
    strings: ["automation.ticker", "Stocks"],
  };

  const createExpectation: (
    pattern: string,
    expected: number | undefined
  ) => {
    pattern: string;
    expected: number | undefined;
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
        assert.isDefined(res);
        assert.equal(res!.score, expectation.expected);
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
      {
        ...ticker,
        score: 44,
        matchInfo: { index: 0, segments: [[0, 6, true]] },
      },
      {
        ...sensorTicker,
        score: 1,
        matchInfo: {
          index: 0,
          segments: [
            [0, 7, false],
            [7, 6, true],
          ],
        },
      },
      {
        ...automationTicker,
        score: -4,
        matchInfo: {
          index: 0,
          segments: [
            [0, 11, false],
            [11, 6, true],
          ],
        },
      },
      {
        ...timerCheckRouter,
        score: -8,
        matchInfo: {
          index: 1,
          segments: [
            [0, 2, true],
            [2, 4, false],
            [6, 1, true],
            [7, 3, false],
            [10, 1, true],
            [11, 5, false],
            [16, 2, true],
          ],
        },
      },
    ];

    const res = fuzzyFilterSort(filter, itemsBeforeFilter);

    assert.deepEqual(res, expectedItemsAfterFilter);
  });
});

const _condense = (tokens: MatchToken[]): [string, boolean][] =>
  tokens.map((token) => [token.text, token.match]);

describe("tokenizeMatchInfo", () => {
  const item: ScorableTextItem = {
    strings: ["automation.ticker"],
  };

  const createExpectation: (
    pattern: string,
    expected: [string, boolean][]
  ) => {
    pattern: string;
    expected: [string, boolean][];
  } = (pattern, expected) => ({
    pattern,
    expected,
  });

  const shouldMatchTokenized = [
    createExpectation("automation.ticker", [["automation.ticker", true]]),
    createExpectation("automation.ticke", [
      ["automation.ticke", true],
      ["r", false],
    ]),
    createExpectation("automation.", [
      ["automation.", true],
      ["ticker", false],
    ]),
    createExpectation("au", [
      ["au", true],
      ["tomation.ticker", false],
    ]),
    createExpectation("automationticker", [
      ["automation", true],
      [".", false],
      ["ticker", true],
    ]),
    createExpectation("tion.tick", [
      ["automa", false],
      ["tion.tick", true],
      ["er", false],
    ]),
    createExpectation("ticker", [
      ["automation.", false],
      ["ticker", true],
    ]),
    createExpectation("automation.r", [
      ["automation.", true],
      ["ticke", false],
      ["r", true],
    ]),
    createExpectation("tick", [
      ["automation.", false],
      ["tick", true],
      ["er", false],
    ]),
    createExpectation("aumacker", [
      ["au", true],
      ["to", false],
      ["ma", true],
      ["tion.ti", false],
      ["cker", true],
    ]),
  ];

  describe(`Item '${item.strings[0]}'`, () => {
    for (const expectation of shouldMatchTokenized) {
      it(`is tokenized with '${expectation.pattern}' to '${expectation.expected}'`, () => {
        const match = fuzzySequentialMatch(expectation.pattern, item);
        const res = _condense(
          tokenizeMatchInfo(item.strings[0], match?.matchInfo.segments)
        );

        assert.deepEqual(res, expectation.expected);
      });
    }
  });

  it("should handle undefined segments gracefully", () => {
    const tokens = _condense(tokenizeMatchInfo("Hello", undefined));
    assert.deepEqual(tokens, [["Hello", false]]);
  });
});

describe("tokenizeConcatenatedMatchInfo", () => {
  const type = "Reload";
  const target = "Automations";
  const item: ScorableTextItem = {
    strings: [`${type} ${target}`],
  };

  const createExpectation: (
    pattern: string,
    expectedType: [string, boolean][],
    expectedTarget: [string, boolean][]
  ) => {
    pattern: string;
    expectedType: [string, boolean][];
    expectedTarget: [string, boolean][];
  } = (pattern, expectedType, expectedTarget) => ({
    pattern,
    expectedType,
    expectedTarget,
  });

  const condense = (tokens: MatchToken[]): [string, boolean][] =>
    tokens.map((token) => [token.text, token.match]);

  const shouldMatchTokenized = [
    createExpectation(
      "Reload Automations",
      [["Reload", true]],
      [["Automations", true]]
    ),
    createExpectation("Reload", [["Reload", true]], [["Automations", false]]),
    createExpectation(
      "rautom",
      [
        ["R", true],
        ["eload", false],
      ],
      [
        ["Autom", true],
        ["ations", false],
      ]
    ),
    createExpectation(
      "Autos",
      [["Reload", false]],
      [
        ["Auto", true],
        ["mation", false],
        ["s", true],
      ]
    ),
  ];

  describe(`Command '${item.strings[0]}'`, () => {
    for (const expectation of shouldMatchTokenized) {
      it(`is tokenized with '${expectation.pattern}' to '${expectation.expectedType}' and '${expectation.expectedTarget}'`, () => {
        const match = fuzzySequentialMatch(expectation.pattern, item);
        const tokens = tokenizeConcatenatedMatchInfo(
          [type, " ", target],
          match!.matchInfo.segments
        );

        assert.deepEqual(condense(tokens[0]), expectation.expectedType);
        assert.deepEqual(condense(tokens[2]), expectation.expectedTarget);
      });
    }
  });

  it("should handle undefined segments gracefully", () => {
    const tokens1 = tokenizeConcatenatedMatchInfo(
      ["Hello", "World"],
      undefined
    );
    const tokens = [condense(tokens1[0]), condense(tokens1[1])];
    assert.deepEqual(tokens, [[["Hello", false]], [["World", false]]]);
  });
});
