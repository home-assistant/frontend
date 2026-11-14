import { describe, expect, it } from "vitest";
import type { RecorderDatabaseUsage } from "../../../../src/data/recorder";
import {
  UNKNOWN_ROW_ID,
  databaseUsageRows,
  groupSmallTables,
} from "../../../../src/panels/config/storage/storage-database-card";

describe("groupSmallTables", () => {
  it("sums tables below the share into other bytes", () => {
    expect(
      groupSmallTables(
        [
          { table: "states", bytes: 900 },
          { table: "statistics", bytes: 95 },
          { table: "schema_changes", bytes: 4 },
          { table: "sqlite_stat1", bytes: 1 },
          { table: "empty", bytes: 0 },
        ],
        0.01
      )
    ).toEqual({
      tables: [
        { table: "states", bytes: 900 },
        { table: "statistics", bytes: 95 },
      ],
      otherBytes: 5,
      totalBytes: 1000,
    });
  });

  it("keeps everything when no table is small", () => {
    expect(groupSmallTables([{ table: "states", bytes: 10 }])).toEqual({
      tables: [{ table: "states", bytes: 10 }],
      otherBytes: 0,
      totalBytes: 10,
    });
  });
});

const USAGE: RecorderDatabaseUsage = {
  generated_at: "2026-11-12T10:00:00+00:00",
  duration: 1.5,
  total_bytes: 1000,
  free_bytes: 100,
  wal_bytes: 50,
  tables: [{ table: "states", bytes: 900 }],
  entities: [
    {
      entity_id: "sensor.energy",
      states: 10,
      states_bytes: 100,
      attributes_bytes: 20,
    },
    { entity_id: null, states: 1, states_bytes: 10, attributes_bytes: 0 },
  ],
  statistics: [
    {
      statistic_id: "sensor.energy",
      source: "recorder",
      statistics: 5,
      statistics_short_term: 7,
      statistics_bytes: 50,
      statistics_short_term_bytes: 70,
    },
    {
      statistic_id: "sensor:external",
      source: "sensor",
      statistics: 3,
      statistics_short_term: 0,
      statistics_bytes: 30,
      statistics_short_term_bytes: 0,
    },
    {
      statistic_id: null,
      source: null,
      statistics: 1,
      statistics_short_term: 0,
      statistics_bytes: 10,
      statistics_short_term_bytes: 0,
    },
  ],
};

describe("databaseUsageRows", () => {
  it("merges the statistics of an entity into its row", () => {
    expect(databaseUsageRows(USAGE)).toEqual([
      {
        id: "sensor.energy",
        states: 10,
        statistics: 5,
        statistics_short_term: 7,
        bytes: 240,
      },
      {
        id: UNKNOWN_ROW_ID,
        states: 1,
        statistics: 1,
        statistics_short_term: 0,
        bytes: 20,
      },
      {
        id: "sensor:external",
        states: 0,
        statistics: 3,
        statistics_short_term: 0,
        bytes: 30,
      },
    ]);
  });

  it("has no sizes when the database cannot report table sizes", () => {
    expect(
      databaseUsageRows({
        ...USAGE,
        tables: null,
        entities: [
          {
            entity_id: "sensor.energy",
            states: 10,
            states_bytes: null,
            attributes_bytes: null,
          },
        ],
        statistics: [
          {
            statistic_id: "sensor:external",
            source: "sensor",
            statistics: 3,
            statistics_short_term: 0,
            statistics_bytes: null,
            statistics_short_term_bytes: null,
          },
        ],
      })
    ).toEqual([
      {
        id: "sensor.energy",
        states: 10,
        statistics: 0,
        statistics_short_term: 0,
        bytes: null,
      },
      {
        id: "sensor:external",
        states: 0,
        statistics: 3,
        statistics_short_term: 0,
        bytes: null,
      },
    ]);
  });
});
