import type {
  DataTableColumnContainer,
  SortingDirection,
} from "../../components/data-table/ha-data-table";
import {
  decodeQueryParams,
  hasQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

export const dataTableQueryParamConfig = {
  string: ["search", "sort", "direction", "group"],
} as const satisfies QueryParamConfig;

export type DataTableQueryParams = QueryParamValues<
  typeof dataTableQueryParamConfig
>;

// How a data table is searched, sorted and grouped
export interface DataTableQueryState {
  search: string;
  sorting?: { column: string; direction: "asc" | "desc" };
  groupColumn?: string;
}

// Sorting uses the column id unless the column has a name for the URL
const sortName = (columns: DataTableColumnContainer, columnId: string) =>
  columns[columnId].urlName ?? columnId;

/**
 * Params for the table's state. Empty and default values are left out, and
 * grouping is only written for columns that have a name for the URL, so
 * internal column ids don't end up in links.
 */
export const dataTableQueryParamsFromState = (
  columns: DataTableColumnContainer,
  search: string,
  sortColumn: string | undefined,
  sortDirection: SortingDirection,
  groupColumn: string | undefined
): DataTableQueryParams => {
  const params: DataTableQueryParams = {};
  if (search) {
    params.search = search;
  }
  if (sortColumn && sortDirection && columns[sortColumn]?.sortable) {
    params.sort = sortName(columns, sortColumn);
    if (sortDirection === "desc") {
      params.direction = "desc";
    }
  }
  if (groupColumn && columns[groupColumn]?.groupable) {
    const group = columns[groupColumn].urlName;
    if (group) {
      params.group = group;
    }
  }
  return params;
};

/**
 * The table's state a link asks for, undefined when it has no table params so
 * what was picked before stays. A link replaces the search, a search left
 * behind would hide part of what it shows. Sorting and grouping it leaves out,
 * or that don't match a column, keep what was picked before.
 */
export const dataTableQueryStateFromUrl = (
  searchParams: SearchParamsSource,
  columns: DataTableColumnContainer
): DataTableQueryState | undefined => {
  if (!hasQueryParams(searchParams, dataTableQueryParamConfig)) {
    return undefined;
  }

  const { search, sort, direction, group } = decodeQueryParams(
    searchParams,
    dataTableQueryParamConfig
  );

  const state: DataTableQueryState = { search: search ?? "" };

  const sortColumn = sort
    ? Object.keys(columns).find(
        (id) => columns[id].sortable && sortName(columns, id) === sort
      )
    : undefined;
  if (sortColumn) {
    state.sorting = {
      column: sortColumn,
      direction: direction === "desc" ? "desc" : "asc",
    };
  }

  const groupColumn = group
    ? Object.keys(columns).find(
        (id) => columns[id].groupable && columns[id].urlName === group
      )
    : undefined;
  if (groupColumn) {
    state.groupColumn = groupColumn;
  }

  return state;
};
