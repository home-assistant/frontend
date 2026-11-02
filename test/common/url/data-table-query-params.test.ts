import { describe, expect, it } from "vitest";

import type { DataTableColumnContainer } from "../../../src/components/data-table/ha-data-table";
import {
  dataTableQueryParamConfig,
  dataTableQueryParamsFromState,
  dataTableQueryStateFromUrl,
} from "../../../src/common/url/data-table-query-params";
import {
  createQueryString,
  hasQueryParams,
  updateQueryString,
} from "../../../src/common/url/query-params";

const columns: DataTableColumnContainer = {
  name: { title: "Name", sortable: true },
  translated_category: {
    title: "Type",
    sortable: true,
    groupable: true,
    urlName: "type",
  },
  area: { title: "Area", groupable: true },
  icon: { title: "" },
};

describe("data table query params", () => {
  it("leaves empty and default values out", () => {
    expect(
      dataTableQueryParamsFromState(columns, "", undefined, null, "")
    ).toEqual({});
    expect(
      dataTableQueryParamsFromState(columns, "", "name", "asc", undefined)
    ).toEqual({ sort: "name" });
  });

  it("uses the public name of a column for sorting and grouping", () => {
    expect(
      dataTableQueryParamsFromState(
        columns,
        "kitchen",
        "translated_category",
        "desc",
        "translated_category"
      )
    ).toEqual({
      search: "kitchen",
      sort: "type",
      direction: "desc",
      group: "type",
    });
  });

  it("does not write grouping for columns without a public name", () => {
    expect(
      dataTableQueryParamsFromState(columns, "", undefined, null, "area")
    ).toEqual({});
  });

  it("reads nothing without table params", () => {
    expect(
      dataTableQueryStateFromUrl("?domain=light&label=a", columns)
    ).toBeUndefined();
  });

  it("reads the state a link asks for", () => {
    expect(
      dataTableQueryStateFromUrl(
        "?search=kitchen&sort=type&direction=desc&group=type",
        columns
      )
    ).toEqual({
      search: "kitchen",
      sorting: { column: "translated_category", direction: "desc" },
      groupColumn: "translated_category",
    });
  });

  it("sorts ascending without a direction and clears the search", () => {
    expect(dataTableQueryStateFromUrl("?sort=name", columns)).toEqual({
      search: "",
      sorting: { column: "name", direction: "asc" },
    });
  });

  it("ignores columns that can't be sorted or grouped that way", () => {
    expect(
      dataTableQueryStateFromUrl(
        "?sort=icon&group=translated_category",
        columns
      )
    ).toEqual({ search: "" });
    expect(dataTableQueryStateFromUrl("?group=area", columns)).toEqual({
      search: "",
    });
  });

  it("round trips the table state", () => {
    const params = dataTableQueryParamsFromState(
      columns,
      "a b,c",
      "name",
      "desc",
      "translated_category"
    );
    expect(
      dataTableQueryStateFromUrl(
        createQueryString(params, dataTableQueryParamConfig),
        columns
      )
    ).toEqual({
      search: "a b,c",
      sorting: { column: "name", direction: "desc" },
      groupColumn: "translated_category",
    });
  });
});

describe("updateQueryString", () => {
  it("replaces the config's params and keeps the others", () => {
    expect(
      updateQueryString(
        "?domain=light&search=old&direction=desc&label=a,b",
        { search: "new", sort: "name" },
        dataTableQueryParamConfig
      )
    ).toBe("domain=light&label=a,b&search=new&sort=name");
  });

  it("removes the config's params when they are empty", () => {
    expect(
      updateQueryString(
        "?search=old&group=type",
        { search: "" },
        dataTableQueryParamConfig
      )
    ).toBe("");
  });

  it("tells whether any of the config's params are present", () => {
    expect(hasQueryParams("?search=", dataTableQueryParamConfig)).toBe(true);
    expect(hasQueryParams("?domain=light", dataTableQueryParamConfig)).toBe(
      false
    );
  });
});
