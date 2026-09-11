import { describe, expect, it } from "vitest";
import type { EntityHistoryState } from "../../../../../src/data/history";
import {
  ACTIVITY_MAX_ENTRIES,
  personActivity,
  zoneActivity,
} from "../../../../../src/panels/lovelace/cards/map/map-activity";

// The window starts at t=1000s; samples are (state, seconds)
const SINCE = 1000 * 1000;
const sample = (s: string, seconds: number): EntityHistoryState =>
  ({ s, lu: seconds, a: {} }) as EntityHistoryState;

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

  it("ignores repeated states and unavailable dropouts", () => {
    const entries = personActivity(
      [
        sample("home", 900),
        sample("home", 1100),
        sample("unavailable", 1150),
        sample("home", 1160),
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
          sample("Work", 1100),
          sample("not_home", 1300),
        ],
        "person.bob": [sample("home", 900), sample("Work", 1200)],
      },
      ["person.anne", "person.bob"],
      "Work",
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
          sample("Work", 900),
          sample("home", 950),
          sample("Gym", 1100),
        ],
      },
      ["person.anne"],
      "Work",
      SINCE
    );
    // Leaving Work happened before the window; Gym is not Work
    expect(entries).toEqual([]);
  });

  it("bridges an unavailable dropout without an event", () => {
    const entries = zoneActivity(
      {
        "person.anne": [
          sample("Work", 900),
          sample("unavailable", 1100),
          sample("Work", 1200),
        ],
      },
      ["person.anne"],
      "Work",
      SINCE
    );
    expect(entries).toEqual([]);
  });
});
