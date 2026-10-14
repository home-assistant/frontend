import { describe, expect, it } from "vitest";
import type { EntityHistoryState } from "../../../../../src/data/history";
import {
  ACTIVITY_MAX_ENTRIES,
  personActivity,
  zoneActivity,
} from "../../../../../src/panels/lovelace/cards/map/map-activity";
import { createMockEntityState } from "../../../../fixtures/hass";

// The window starts at t=1000s; samples are (state, seconds)
const SINCE = 1000 * 1000;
const sample = (
  state: string,
  seconds: number,
  inZones?: string[]
): EntityHistoryState => ({
  s: state,
  lu: seconds,
  a: inZones === undefined ? {} : { in_zones: inZones },
});

const zones = {
  "zone.home": createMockEntityState("zone.home", "0", {
    friendly_name: "Home",
  }),
  "zone.work": createMockEntityState("zone.work", "0", {
    friendly_name: "Work",
  }),
};

const duplicateZones = {
  ...zones,
  "zone.other_work": createMockEntityState("zone.other_work", "0", {
    friendly_name: "Work",
  }),
};

describe("personActivity", () => {
  it("lists state changes inside the window, newest first", () => {
    const entries = personActivity(
      [sample("home", 900), sample("not_home", 1100), sample("work", 1200)],
      SINCE,
      zones
    );
    expect(entries.map((e) => e.state)).toEqual(["work", "not_home"]);
    expect(entries[0].when.getTime()).toBe(1200 * 1000);
  });

  it("counts the first sample only when it lies inside the window", () => {
    // Before the window it is the state at the window's start, not an event
    expect(personActivity([sample("home", 900)], SINCE, zones)).toEqual([]);
    expect(personActivity([sample("home", 1100)], SINCE, zones)).toEqual([
      { state: "home", zoneId: "zone.home", when: new Date(1100 * 1000) },
    ]);
  });

  it("ignores repeated states and unavailable or unknown dropouts", () => {
    const entries = personActivity(
      [
        sample("home", 900),
        sample("home", 1100),
        sample("unavailable", 1150),
        sample("home", 1160),
        sample("unknown", 1170),
        sample("home", 1180),
        sample("not_home", 1200),
      ],
      SINCE,
      zones
    );
    expect(entries.map((e) => e.state)).toEqual(["not_home"]);
  });

  it("caps the list", () => {
    const history = Array.from({ length: 30 }, (_, i) =>
      sample(`zone_${i}`, 1001 + i)
    );
    expect(personActivity(history, SINCE, zones)).toHaveLength(
      ACTIVITY_MAX_ENTRIES
    );
  });

  it("records direct transitions between zones with the same name", () => {
    const entries = personActivity(
      [
        sample("Work", 900, ["zone.work"]),
        sample("Work", 1100, ["zone.other_work"]),
        sample("Work", 1200, ["zone.work"]),
      ],
      SINCE,
      duplicateZones
    );

    expect(entries).toEqual([
      { state: "Work", zoneId: "zone.work", when: new Date(1200 * 1000) },
      { state: "Work", zoneId: "zone.other_work", when: new Date(1100 * 1000) },
    ]);
  });

  it("preserves historical zone IDs after a zone is renamed", () => {
    const entries = personActivity(
      [sample("Work", 1100, ["zone.work", "zone.other_work"])],
      SINCE,
      {
        ...duplicateZones,
        "zone.work": createMockEntityState("zone.work", "0", {
          friendly_name: "New workplace",
        }),
      }
    );

    expect(entries[0]).toMatchObject({
      state: "Work",
      zoneId: "zone.work",
    });
  });

  it("ignores passive zones and changes that leave the active zone unchanged", () => {
    const entries = personActivity(
      [
        sample("Work", 900, ["zone.work"]),
        sample("Work", 1100, ["zone.passive", "zone.work"]),
        sample("Work", 1200, ["zone.passive", "zone.other_work"]),
        sample("unavailable", 1250),
        sample("Work", 1300, ["zone.other_work"]),
      ],
      SINCE,
      {
        ...duplicateZones,
        "zone.passive": createMockEntityState("zone.passive", "0", {
          friendly_name: "Work",
          passive: true,
        }),
      }
    );

    expect(entries).toEqual([
      { state: "Work", zoneId: "zone.other_work", when: new Date(1200 * 1000) },
    ]);
  });

  it.each([{ inZones: undefined }, { inZones: [] }])(
    "does not guess a legacy zone with duplicate names when in_zones is $inZones",
    ({ inZones }) => {
      const entries = personActivity(
        [sample("Work", 1100, inZones)],
        SINCE,
        duplicateZones
      );

      expect(entries[0].zoneId).toBeUndefined();
    }
  );

  it("does not fall back to names when a reported zone no longer exists", () => {
    const entries = personActivity(
      [sample("Work", 1100, ["zone.removed"])],
      SINCE,
      zones
    );

    expect(entries[0].zoneId).toBeUndefined();
  });

  it.each([{ inZones: undefined }, { inZones: [] }])(
    "resolves unique legacy names and home when in_zones is $inZones",
    ({ inZones }) => {
      const entries = personActivity(
        [
          sample("home", 1100, inZones),
          sample("not_home", 1200, inZones),
          sample("Work", 1300, inZones),
        ],
        SINCE,
        zones
      );

      expect(entries.map((entry) => entry.zoneId)).toEqual([
        "zone.work",
        undefined,
        "zone.home",
      ]);
    }
  );

  it("does not create a transition when zone IDs appear or disappear for the same legacy location", () => {
    expect(
      personActivity(
        [
          sample("Work", 900, []),
          sample("Work", 1100, ["zone.work"]),
          sample("Work", 1200, []),
        ],
        SINCE,
        zones
      )
    ).toEqual([]);
  });
});

describe("zoneActivity", () => {
  it("reports arrivals and departures per person, newest first", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("not_home", 900),
          sample("Work", 1100),
          sample("not_home", 1300),
        ],
        "person.bob": [sample("home", 900), sample("Work", 1200)],
      },
      ["person.anne", "person.bob"],
      "zone.work",
      SINCE,
      zones
    );
    expect(
      entries.map((e) => [e.personId, e.arrived, e.when.getTime() / 1000])
    ).toEqual([
      ["person.anne", false, 1300],
      ["person.bob", true, 1200],
      ["person.anne", true, 1100],
    ]);
  });

  it("does not count moving between other zones or the window's first sample", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("Work", 900),
          sample("home", 950),
          sample("Gym", 1100),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE,
      zones
    );
    // Leaving Work happened before the window; Gym is not Work
    expect(entries).toEqual([]);
  });

  it("counts an in-window first sample as an arrival", () => {
    // A newly created person has no state at the window's start, so their
    // first sample inside the window is a real arrival
    const entries = zoneActivity(
      { "person.anne": [sample("Work", 1100)] },
      ["person.anne"],
      "zone.work",
      SINCE,
      zones
    );
    expect(entries.map((e) => [e.arrived, e.when.getTime() / 1000])).toEqual([
      [true, 1100],
    ]);
  });

  it("bridges an unavailable or unknown dropout without an event", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("Work", 900),
          sample("unavailable", 1100),
          sample("Work", 1150),
          sample("unknown", 1200),
          sample("Work", 1250),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE,
      zones
    );
    expect(entries).toEqual([]);
  });

  it("keeps arrivals and departures in same-named zones separate", () => {
    const history = {
      "person.anne": [
        sample("not_home", 900, []),
        sample("Work", 1100, ["zone.work"]),
        sample("not_home", 1300, []),
      ],
      "person.bob": [
        sample("not_home", 900, []),
        sample("Work", 1200, ["zone.other_work"]),
        sample("not_home", 1400, []),
      ],
    };
    const personIds = Object.keys(history);

    expect(
      zoneActivity(history, personIds, "zone.work", SINCE, duplicateZones)
    ).toEqual([
      {
        state: "not_home",
        personId: "person.anne",
        arrived: false,
        when: new Date(1300 * 1000),
      },
      {
        state: "Work",
        personId: "person.anne",
        arrived: true,
        when: new Date(1100 * 1000),
      },
    ]);
    expect(
      zoneActivity(history, personIds, "zone.other_work", SINCE, duplicateZones)
    ).toEqual([
      {
        state: "not_home",
        personId: "person.bob",
        arrived: false,
        when: new Date(1400 * 1000),
      },
      {
        state: "Work",
        personId: "person.bob",
        arrived: true,
        when: new Date(1200 * 1000),
      },
    ]);
  });

  it("records a departure and arrival when only the zone ID changes", () => {
    const history = {
      "person.anne": [
        sample("Work", 900, ["zone.work"]),
        sample("Work", 1100, ["zone.other_work"]),
      ],
    };
    for (const [zoneId, arrived] of [
      ["zone.work", false],
      ["zone.other_work", true],
    ] as const) {
      expect(
        zoneActivity(history, ["person.anne"], zoneId, SINCE, duplicateZones)
      ).toEqual([
        {
          state: "Work",
          personId: "person.anne",
          arrived,
          when: new Date(1100 * 1000),
        },
      ]);
    }
  });

  it("uses historical membership even after a zone is renamed", () => {
    const entries = zoneActivity(
      { "person.anne": [sample("Old workplace", 1100, ["zone.work"])] },
      ["person.anne"],
      "zone.work",
      SINCE,
      zones
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].arrived).toBe(true);
  });

  it("includes membership in overlapping zones without counting active-zone changes", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("not_home", 900, []),
          sample("Work", 1100, ["zone.other_work", "zone.work"]),
          sample("Work", 1200, ["zone.work"]),
          sample("not_home", 1300, []),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE,
      duplicateZones
    );

    expect(
      entries.map((entry) => [entry.arrived, entry.when.getTime() / 1000])
    ).toEqual([
      [false, 1300],
      [true, 1100],
    ]);
  });

  it("does not assign legacy history to multiple zones with the same name", () => {
    const history = { "person.anne": [sample("Work", 1100)] };

    for (const zoneId of ["zone.work", "zone.other_work"]) {
      expect(
        zoneActivity(history, ["person.anne"], zoneId, SINCE, duplicateZones)
      ).toEqual([]);
    }
  });

  it("does not infer membership from names when in_zones is empty", () => {
    expect(
      zoneActivity(
        { "person.anne": [sample("Work", 1100, [])] },
        ["person.anne"],
        "zone.work",
        SINCE,
        zones
      )
    ).toEqual([]);
  });
});
