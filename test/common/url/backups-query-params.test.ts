import { describe, expect, it } from "vitest";

import {
  BACKUP_LOCATIONS_FILTER,
  BACKUP_TYPE_FILTER,
  backupsFilterQueryParamConfig,
  backupsFilterQueryParams,
  backupsFilterQueryString,
  backupsLinkFromUrl,
} from "../../../src/common/url/backups-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

describe("backups query params", () => {
  it("reads nothing without table params", () => {
    expect(backupsLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(backupsLinkFromUrl("?location=hassio.local")).toEqual({
      search: "",
      filters: {
        [BACKUP_TYPE_FILTER]: [],
        [BACKUP_LOCATIONS_FILTER]: ["hassio.local"],
      },
    });
  });

  it("reads type=all as every type", () => {
    expect(
      backupsLinkFromUrl("?type=all")?.filters[BACKUP_TYPE_FILTER]
    ).toEqual([]);
  });

  it("round trips the filters", () => {
    const filters = {
      [BACKUP_TYPE_FILTER]: ["automatic", "manual"],
      [BACKUP_LOCATIONS_FILTER]: ["hassio.local", "cloud.cloud"],
    };

    expect(
      backupsLinkFromUrl(
        createQueryString(
          backupsFilterQueryParams(filters),
          backupsFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });

  it("compares the same filters in another order as equal", () => {
    expect(
      backupsFilterQueryString({
        [BACKUP_TYPE_FILTER]: ["manual", "automatic"],
      })
    ).toBe(
      backupsFilterQueryString({
        [BACKUP_TYPE_FILTER]: ["automatic", "manual"],
      })
    );
    expect(backupsFilterQueryString({ [BACKUP_TYPE_FILTER]: [] })).toBe(
      backupsFilterQueryString({})
    );
  });
});
