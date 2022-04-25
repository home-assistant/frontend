import { assert, expect } from "chai";

import {
  fuzzySortFilterSort,
  ScorableTextItem,
} from "../../../src/common/string/filter/sequence-matching";

describe("fuzzySequentialMatch", () => {
  const item: ScorableTextItem = {
    strings: ["automation.ticker", "Stocks"],
  };

  const shouldMatchEntity = [
    "",
    " ",
    "automation.ticker",
    "stocks",
    "automation.ticke",
    "automation. ticke",
    "automation.",
    "automationticker",
    "automation.r",
    "aumatick",
    "tion.tick",
    "aion.tck",
    "s",
    "au.tce",
    "au",
    "ticker",
    "tick",
    "ioticker",
    "sks",
    "tomaontkr",
    "atmto.ikr",
    "uoaintce",
  ];

  const shouldNotMatchEntity = [
    "abcdefghijklmnopqrstuvwxyz",
    "automation.tickerz",
    "1",
    "noitamotua",
    "autostocks",
    "stox",
  ];

  describe(`Entity '${item.strings[0]}'`, () => {
    for (const filter of shouldMatchEntity) {
      it(`Should matches ${filter}`, () => {
        const res = fuzzySortFilterSort(filter, [item]);
        assert.lengthOf(res, 1);
      });
    }

    for (const badFilter of shouldNotMatchEntity) {
      it(`fails to match with '${badFilter}'`, () => {
        const res = fuzzySortFilterSort(badFilter, [item]);
        assert.lengthOf(res, 0);
      });
    }
  });
});

describe("fuzzyFilterSort original tests", () => {
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
      { ...ticker, score: 0 },
      { ...sensorTicker, score: -14 },
      { ...automationTicker, score: -22 },
      { ...timerCheckRouter, score: -32012 },
    ];

    const res = fuzzySortFilterSort(filter, itemsBeforeFilter);

    assert.deepEqual(res, expectedItemsAfterFilter);
  });
});

describe("Fuzzy filter new tests", () => {
  const testEntities = [
    {
      id: "binary_sensor.garage_door_opened",
      name: "Garage Door Opened (Sensor, Binary)",
    },
    {
      id: "sensor.garage_door_status",
      name: "Garage Door Opened (Sensor)",
    },
    {
      id: "sensor.temperature_living_room",
      name: "[Living room] temperature",
    },
    {
      id: "sensor.temperature_parents_bedroom",
      name: "[Parents bedroom] temperature",
    },
    {
      id: "sensor.temperature_children_bedroom",
      name: "[Children bedroom] temperature",
    },
  ];

  function testEntitySearch(
    searchInput: string | null,
    expectedResults: string[]
  ) {
    const sortableEntities = testEntities.map((entity) => ({
      strings: [entity.id, entity.name],
      entity: entity,
    }));
    const sortedEntities = fuzzySortFilterSort(
      searchInput || "",
      sortableEntities
    );
    // console.log(sortedEntities);
    expect(sortedEntities.map((it) => it.entity.id)).to.have.ordered.members(
      expectedResults
    );
  }

  it(`test empty or null query`, () => {
    testEntitySearch(
      "",
      testEntities.map((it) => it.id)
    );
    testEntitySearch(
      null,
      testEntities.map((it) => it.id)
    );
  });

  it(`test single word search`, () => {
    testEntitySearch("bedroom", [
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test no result`, () => {
    testEntitySearch("does not exist", []);
    testEntitySearch("betroom", []);
  });

  it(`test single word search with typo`, () => {
    testEntitySearch("bedorom", [
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test multi word search`, () => {
    testEntitySearch("bedroom children", [
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test partial word search`, () => {
    testEntitySearch("room", [
      "sensor.temperature_living_room",
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test mixed cased word search`, () => {
    testEntitySearch("garage binary", ["binary_sensor.garage_door_opened"]);
  });

  it(`test mixed id and name search`, () => {
    testEntitySearch("status opened", ["sensor.garage_door_status"]);
  });

  it(`test special chars in query`, () => {
    testEntitySearch("sensor.temperature", [
      "sensor.temperature_living_room",
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);

    testEntitySearch("sensor.temperature parents", [
      "sensor.temperature_parents_bedroom",
    ]);
    testEntitySearch("parents_Bedroom", ["sensor.temperature_parents_bedroom"]);
  });

  it(`test search in name`, () => {
    testEntitySearch("Binary)", ["binary_sensor.garage_door_opened"]);

    testEntitySearch("Binary)NotExists", []);
  });

  it(`test regex special chars`, () => {
    // Should return an empty result, but no error
    testEntitySearch("\\{}()*+?.,[])", []);

    testEntitySearch("[Children bedroom]", [
      "sensor.temperature_children_bedroom",
    ]);
  });
});
