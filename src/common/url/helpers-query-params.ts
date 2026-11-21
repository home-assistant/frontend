import type { DataTableFiltersValues } from "../../data/data_table_filters";
import { dataTableQueryParamConfig } from "./data-table-query-params";
import {
  excludedFilters,
  floorAreasFilterFromParams,
  floorAreasFilterParams,
  listFilterFromParams,
  listFilterIds,
  listFilterNone,
  matchAllFilters,
} from "./filter-query-params";
import {
  createQueryString,
  decodeQueryParams,
  hasQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

// The filters of the helpers table. Search, sorting and grouping are kept by
// the data table, see data-table-query-params.
export const helpersFilterQueryParamConfig = {
  list: [
    "floor",
    "area",
    "device",
    "label",
    "category",
    "assistants",
    // Read until 2027.5, replaced with `assistants` on the next write
    "voice_assistant",
    // The filters that show the items that don't match their selection
    "exclude",
    // The filters that match the items with every selected id
    "match_all",
  ],
  boolean: [
    { key: "no_area", trueValue: "1" },
    { key: "no_device", trueValue: "1" },
    { key: "no_label", trueValue: "1" },
    { key: "no_category", trueValue: "1" },
    { key: "no_assistants", trueValue: "1" },
  ],
} as const satisfies QueryParamConfig;

export type HelpersFilterQueryParams = QueryParamValues<
  typeof helpersFilterQueryParamConfig
>;

export const helpersFilterQueryParams = (
  filters: DataTableFiltersValues
): HelpersFilterQueryParams => ({
  ...floorAreasFilterParams(filters["ha-filter-floor-areas"]),
  device: listFilterIds(filters["ha-filter-devices"]),
  no_device: listFilterNone(filters["ha-filter-devices"]),
  label: listFilterIds(filters["ha-filter-labels"]),
  no_label: listFilterNone(filters["ha-filter-labels"]),
  category: listFilterIds(filters["ha-filter-categories"]),
  no_category: listFilterNone(filters["ha-filter-categories"]),
  assistants: listFilterIds(filters["ha-filter-voice-assistants"]),
  no_assistants: listFilterNone(filters["ha-filter-voice-assistants"]),
  exclude: excludedFilters({
    assistants: filters["ha-filter-voice-assistants"],
    area: filters["ha-filter-floor-areas"],
    device: filters["ha-filter-devices"],
    label: filters["ha-filter-labels"],
    category: filters["ha-filter-categories"],
  }),
  match_all: matchAllFilters({
    label: filters["ha-filter-labels"],
    assistants: filters["ha-filter-voice-assistants"],
  }),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const helpersFilterQueryString = (
  filters: DataTableFiltersValues
): string => {
  const params = helpersFilterQueryParams(filters);
  const sorted: HelpersFilterQueryParams = { ...params };

  for (const key of helpersFilterQueryParamConfig.list) {
    sorted[key] = params[key] && [...params[key]].sort();
  }

  return createQueryString(sorted, helpersFilterQueryParamConfig);
};

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping.
export interface HelpersLink {
  search: string;
  filters: DataTableFiltersValues;
}

export const helpersLinkFromUrl = (
  searchParams: SearchParamsSource
): HelpersLink | undefined => {
  if (
    !hasQueryParams(searchParams, helpersFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(searchParams, helpersFilterQueryParamConfig);

  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  const values = (
    key: (typeof helpersFilterQueryParamConfig.list)[number]
  ): string[] => params[key]?.filter(Boolean) ?? [];

  const floors = values("floor");
  const areas = values("area");
  const exclude = values("exclude");
  const matchAll = values("match_all");
  const assistants = values("assistants");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-floor-areas": floorAreasFilterFromParams(
        floors,
        areas,
        params.no_area,
        exclude
      ),
      "ha-filter-devices": listFilterFromParams(
        values("device"),
        params.no_device,
        exclude.includes("device")
      ),
      "ha-filter-labels": listFilterFromParams(
        values("label"),
        params.no_label,
        exclude.includes("label"),
        matchAll.includes("label")
      ),
      "ha-filter-categories": listFilterFromParams(
        values("category"),
        params.no_category,
        exclude.includes("category")
      ),
      "ha-filter-voice-assistants": listFilterFromParams(
        assistants.length ? assistants : values("voice_assistant"),
        params.no_assistants,
        exclude.includes("assistants"),
        matchAll.includes("assistants")
      ),
    },
  };
};
