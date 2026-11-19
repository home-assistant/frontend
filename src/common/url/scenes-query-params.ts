import type {
  DataTableFilter,
  DataTableFilters,
} from "../../data/data_table_filters";
import { dataTableQueryParamConfig } from "./data-table-query-params";
import {
  excludedFilters,
  floorAreasFilterFromParams,
  floorAreasFilterParams,
  listFilterFromParams,
  listFilterIds,
  listFilterNone,
} from "./filter-query-params";
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
    // The filters that show the items that don't match their selection
    "exclude",
  ],
  boolean: [
    { key: "no_area", trueValue: "1" },
    { key: "no_device", trueValue: "1" },
    { key: "no_label", trueValue: "1" },
    { key: "no_category", trueValue: "1" },
    { key: "no_assistants", trueValue: "1" },
  ],
} as const satisfies QueryParamConfig;

export type ScenesFilterQueryParams = QueryParamValues<
  typeof scenesFilterQueryParamConfig
>;

export const scenesFilterQueryParams = (
  filters: DataTableFilters
): ScenesFilterQueryParams => ({
  ...floorAreasFilterParams(filters["ha-filter-floor-areas"]?.value),
  device: listFilterIds(filters["ha-filter-devices"]?.value),
  no_device: listFilterNone(filters["ha-filter-devices"]?.value),
  entity: listFilterIds(filters["ha-filter-entities"]?.value),
  label: listFilterIds(filters["ha-filter-labels"]?.value),
  no_label: listFilterNone(filters["ha-filter-labels"]?.value),
  category: listFilterIds(filters["ha-filter-categories"]?.value),
  no_category: listFilterNone(filters["ha-filter-categories"]?.value),
  assistants: listFilterIds(filters["ha-filter-voice-assistants"]?.value),
  no_assistants: listFilterNone(filters["ha-filter-voice-assistants"]?.value),
  exclude: excludedFilters({
    assistants: filters["ha-filter-voice-assistants"]?.value,
    entity: filters["ha-filter-entities"]?.value,
    area: filters["ha-filter-floor-areas"]?.value,
    device: filters["ha-filter-devices"]?.value,
    label: filters["ha-filter-labels"]?.value,
    category: filters["ha-filter-categories"]?.value,
  }),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const scenesFilterQueryString = (filters: DataTableFilters): string => {
  const params = scenesFilterQueryParams(filters);
  const sorted: ScenesFilterQueryParams = { ...params };

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

  const values = (
    key: (typeof scenesFilterQueryParamConfig.list)[number]
  ): string[] => params[key]?.filter(Boolean) ?? [];

  const filter = (value: DataTableFilter["value"]): DataTableFilter => ({
    value,
    items: undefined,
  });

  const floors = values("floor");
  const areas = values("area");
  const exclude = values("exclude");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-floor-areas": filter(
        floorAreasFilterFromParams(floors, areas, params.no_area, exclude)
      ),
      "ha-filter-devices": filter(
        listFilterFromParams(
          values("device"),
          params.no_device,
          exclude.includes("device")
        )
      ),
      "ha-filter-entities": filter(
        listFilterFromParams(
          values("entity"),
          false,
          exclude.includes("entity")
        )
      ),
      "ha-filter-labels": filter(
        listFilterFromParams(
          values("label"),
          params.no_label,
          exclude.includes("label")
        )
      ),
      "ha-filter-categories": filter(
        listFilterFromParams(
          values("category"),
          params.no_category,
          exclude.includes("category")
        )
      ),
      "ha-filter-voice-assistants": filter(
        listFilterFromParams(
          values("assistants"),
          params.no_assistants,
          exclude.includes("assistants")
        )
      ),
    },
  };
};
