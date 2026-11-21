import type {
  DataTableFiltersValue,
  DataTableFiltersValues,
} from "../../data/data_table_filters";
import { dataTableQueryParamConfig } from "./data-table-query-params";
import {
  excludedFilters,
  matchAllFilters,
  listFilterFromParams,
  listFilterIds,
} from "./filter-query-params";
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
  list: [
    "type",
    "location",
    // The filters that show the items that don't match their selection
    "exclude",
    // The filters that match the items with every selected id
    "match_all",
  ],
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
  location: listFilterIds(filters[BACKUP_LOCATIONS_FILTER]),
  exclude: excludedFilters({ location: filters[BACKUP_LOCATIONS_FILTER] }),
  match_all: matchAllFilters({ location: filters[BACKUP_LOCATIONS_FILTER] }),
});

const sorted = (values?: string[]): string[] | undefined =>
  values && [...values].sort();

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const backupsFilterQueryString = (
  filters: DataTableFiltersValues
): string => {
  const { type, location, exclude, match_all } =
    backupsFilterQueryParams(filters);

  return createQueryString(
    { type: sorted(type), location: sorted(location), exclude, match_all },
    backupsFilterQueryParamConfig
  );
};

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
      [BACKUP_LOCATIONS_FILTER]: listFilterFromParams(
        params.location?.filter(Boolean) ?? [],
        false,
        !!params.exclude?.includes("location"),
        !!params.match_all?.includes("location")
      ),
    },
  };
};
