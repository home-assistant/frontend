import { describe, expect, it } from "vitest";
import type { EntityHistoryState } from "../../../../../src/data/history";
import {
  ACTIVITY_MAX_ENTRIES,
  personActivity,
  zoneActivity,
} from "../../../../../src/panels/lovelace/cards/map/map-activity";

// The window starts at t=1000s; samples are (state, seconds)
const SINCE = 1000 * 1000;
const sample = (
  s: string,
  seconds: number,
  inZones?: string[]
): EntityHistoryState => ({ s, lu: seconds, a: { in_zones: inZones } });

describe("personActivity", () => {
  it("lists state changes inside the window, newest first", () => {
    const entries = personActivity(
      [sample("home", 900), sample("not_home", 1100), sample("work", 1200)],
      SINCE
    );
    expect(entries.map((e) => e.state)).toEqual(["work", "not_home"]);
    expect(entries[0].when.getTime()).toBe(1200 * 1000);
  });

  it("counts the first sample only when it lies inside the window", () => {
    // Before the window it is the state at the window's start, not an event
    expect(personActivity([sample("home", 900)], SINCE)).toEqual([]);
    expect(personActivity([sample("home", 1100)], SINCE)).toEqual([
      { state: "home", when: new Date(1100 * 1000) },
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
      SINCE
    );
    expect(entries.map((e) => e.state)).toEqual(["not_home"]);
  });

  it("caps the list", () => {
    const history = Array.from({ length: 30 }, (_, i) =>
      sample(`zone_${i}`, 1001 + i)
    );
    expect(personActivity(history, SINCE)).toHaveLength(ACTIVITY_MAX_ENTRIES);
  });
});

describe("zoneActivity", () => {
  it("reports arrivals and departures per person, newest first", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("not_home", 900),
          sample("Work", 1100, ["zone.work"]),
          sample("not_home", 1300),
        ],
        "person.bob": [
          sample("home", 900),
          sample("Work", 1200, ["zone.work"]),
        ],
      },
      ["person.anne", "person.bob"],
      "zone.work",
      SINCE
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
          sample("Work", 900, ["zone.work"]),
          sample("home", 950),
          sample("Gym", 1100),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE
    );
    // Leaving Work happened before the window; Gym is not Work
    expect(entries).toEqual([]);
  });

  it("counts an in-window first sample as an arrival", () => {
    // A newly created person has no state at the window's start, so their
    // first sample inside the window is a real arrival
    const entries = zoneActivity(
      { "person.anne": [sample("Work", 1100, ["zone.work"])] },
      ["person.anne"],
      "zone.work",
      SINCE
    );
    expect(entries.map((e) => [e.arrived, e.when.getTime() / 1000])).toEqual([
      [true, 1100],
    ]);
  });

  it("bridges an unavailable or unknown dropout without an event", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("Work", 900, ["zone.work"]),
          sample("unavailable", 1100),
          sample("Work", 1150, ["zone.work"]),
          sample("unknown", 1200),
          sample("Work", 1250, ["zone.work"]),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE
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

    expect(zoneActivity(history, personIds, "zone.work", SINCE)).toEqual([
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
    expect(zoneActivity(history, personIds, "zone.other_work", SINCE)).toEqual([
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

  it("includes membership in overlapping zones without counting active-zone changes", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("not_home", 900, []),
          sample("home", 1100, ["zone.home", "zone.work"]),
          sample("Work", 1200, ["zone.work"]),
          sample("not_home", 1300, []),
        ],
      },
      ["person.anne"],
      "zone.work",
      SINCE
    );

    expect(
      entries.map((entry) => [entry.arrived, entry.when.getTime() / 1000])
    ).toEqual([
      [false, 1300],
      [true, 1100],
    ]);
  });
});
