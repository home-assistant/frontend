import type {
  DataTableFilter,
  DataTableFilters,
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

// The filters of the devices table. Search, sorting and grouping are kept by
// the data table, see data-table-query-params.
export const devicesFilterQueryParamConfig = {
  list: [
    "status",
    "floor",
    "area",
    "domain",
    "label",
    "config_entry",
    "sub_entry",
  ],
} as const satisfies QueryParamConfig;

export type DevicesFilterQueryParams = QueryParamValues<
  typeof devicesFilterQueryParamConfig
>;

const list = (filter: DataTableFilter | undefined): string[] | undefined =>
  Array.isArray(filter?.value) ? filter.value : undefined;

const floorAreas = (
  filter: DataTableFilter | undefined
): Record<string, string[]> | undefined =>
  filter?.value && !Array.isArray(filter.value) ? filter.value : undefined;

export const devicesFilterQueryParams = (
  filters: DataTableFilters
): DevicesFilterQueryParams => ({
  status: list(filters["ha-filter-states"]),
  floor: floorAreas(filters["ha-filter-floor-areas"])?.floors,
  area: floorAreas(filters["ha-filter-floor-areas"])?.areas,
  domain: list(filters["ha-filter-integrations"]),
  label: list(filters["ha-filter-labels"]),
  config_entry: list(filters.config_entry),
  sub_entry: list(filters.sub_entry),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const devicesFilterQueryString = (filters: DataTableFilters): string => {
  const params = devicesFilterQueryParams(filters);
  const sorted: DevicesFilterQueryParams = {};

  for (const key of devicesFilterQueryParamConfig.list) {
    sorted[key] = params[key] && [...params[key]].sort();
  }

  return createQueryString(sorted, devicesFilterQueryParamConfig);
};

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping. The filters work out their items from the values.
export interface DevicesLink {
  search: string;
  filters: DataTableFilters;
}

export const devicesLinkFromUrl = (
  searchParams: SearchParamsSource
): DevicesLink | undefined => {
  if (
    !hasQueryParams(searchParams, devicesFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(searchParams, devicesFilterQueryParamConfig);

  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  const values = (key: keyof DevicesFilterQueryParams): string[] =>
    params[key]?.filter(Boolean) ?? [];

  const filter = (value: DataTableFilter["value"]): DataTableFilter => ({
    value,
    items: undefined,
  });

  const floors = values("floor");
  const areas = values("area");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-states": filter(values("status")),
      "ha-filter-floor-areas": filter(
        floors.length || areas.length ? { floors, areas } : undefined
      ),
      "ha-filter-integrations": filter(values("domain")),
      "ha-filter-labels": filter(values("label")),
      config_entry: filter(values("config_entry")),
      sub_entry: filter(values("sub_entry")),
    },
  };
};
