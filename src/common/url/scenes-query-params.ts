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

// The filters of the scenes table. Search, sorting and grouping are kept by
// the data table, see data-table-query-params.
export const scenesFilterQueryParamConfig = {
  list: [
    "floor",
    "area",
    "device",
    "entity",
    "label",
    "category",
    "assistants",
  ],
} as const satisfies QueryParamConfig;

export type ScenesFilterQueryParams = QueryParamValues<
  typeof scenesFilterQueryParamConfig
>;

const list = (filter: DataTableFilter | undefined): string[] | undefined =>
  Array.isArray(filter?.value) ? filter.value : undefined;

const floorAreas = (
  filter: DataTableFilter | undefined
): Record<string, string[]> | undefined =>
  filter?.value && !Array.isArray(filter.value) ? filter.value : undefined;

export const scenesFilterQueryParams = (
  filters: DataTableFilters
): ScenesFilterQueryParams => ({
  floor: floorAreas(filters["ha-filter-floor-areas"])?.floors,
  area: floorAreas(filters["ha-filter-floor-areas"])?.areas,
  device: list(filters["ha-filter-devices"]),
  entity: list(filters["ha-filter-entities"]),
  label: list(filters["ha-filter-labels"]),
  category: list(filters["ha-filter-categories"]),
  assistants: list(filters["ha-filter-voice-assistants"]),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const scenesFilterQueryString = (filters: DataTableFilters): string => {
  const params = scenesFilterQueryParams(filters);
  const sorted: ScenesFilterQueryParams = {};

  for (const key of scenesFilterQueryParamConfig.list) {
    sorted[key] = params[key] && [...params[key]].sort();
  }

  return createQueryString(sorted, scenesFilterQueryParamConfig);
};

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping. The filters work out their items from the values.
export interface ScenesLink {
  search: string;
  filters: DataTableFilters;
}

export const scenesLinkFromUrl = (
  searchParams: SearchParamsSource
): ScenesLink | undefined => {
  if (
    !hasQueryParams(searchParams, scenesFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(searchParams, scenesFilterQueryParamConfig);

  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  const values = (key: keyof ScenesFilterQueryParams): string[] =>
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
      "ha-filter-floor-areas": filter(
        floors.length || areas.length ? { floors, areas } : undefined
      ),
      "ha-filter-devices": filter(values("device")),
      "ha-filter-entities": filter(values("entity")),
      "ha-filter-labels": filter(values("label")),
      // The category filter picks one category
      "ha-filter-categories": filter(values("category").slice(0, 1)),
      "ha-filter-voice-assistants": filter(values("assistants")),
    },
  };
};
