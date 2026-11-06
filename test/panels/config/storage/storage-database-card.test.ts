import { describe, expect, it } from "vitest";
import { groupSmallTables } from "../../../../src/panels/config/storage/storage-database-card";

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
