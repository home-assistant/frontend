import type {
  DataTableFiltersValue,
  DataTableFiltersValues,
} from "../../data/data_table_filters";
import { dataTableQueryParamConfig } from "./data-table-query-params";
import {
  createQueryString,
  decodeQueryParams,
  hasQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

// The filter-pane keys of the backups table's filters
export const BACKUP_TYPE_FILTER = "ha-filter-states";
export const BACKUP_LOCATIONS_FILTER = "backup-locations";

// The filters of the backups table. Search, sorting and grouping are kept by
// the data table, see data-table-query-params.
export const backupsFilterQueryParamConfig = {
  list: ["type", "location"],
} as const satisfies QueryParamConfig;

export type BackupsFilterQueryParams = QueryParamValues<
  typeof backupsFilterQueryParamConfig
>;

const list = (value: DataTableFiltersValue): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

export const backupsFilterQueryParams = (
  filters: DataTableFiltersValues
): BackupsFilterQueryParams => ({
  type: list(filters[BACKUP_TYPE_FILTER]),
  location: list(filters[BACKUP_LOCATIONS_FILTER]),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, compare equal
export const backupsFilterQueryString = (
  filters: DataTableFiltersValues
): string =>
  createQueryString(
    backupsFilterQueryParams(filters),
    backupsFilterQueryParamConfig
  );

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping.
export interface BackupsLink {
  search: string;
  filters: DataTableFiltersValues;
}

export const backupsLinkFromUrl = (
  searchParams: SearchParamsSource
): BackupsLink | undefined => {
  if (
    !hasQueryParams(searchParams, backupsFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(searchParams, backupsFilterQueryParamConfig);
  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  return {
    search: search ?? "",
    filters: {
      // `type=all` asks for every type, as the backups overview links do
      [BACKUP_TYPE_FILTER]:
        params.type?.filter((type) => type && type !== "all") ?? [],
      [BACKUP_LOCATIONS_FILTER]: params.location?.filter(Boolean) ?? [],
    },
  };
};
