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
  ],
} as const satisfies QueryParamConfig;

export type HelpersFilterQueryParams = QueryParamValues<
  typeof helpersFilterQueryParamConfig
>;

const list = (value: DataTableFiltersValue): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

const floorAreas = (
  value: DataTableFiltersValue
): Record<string, string[]> | undefined =>
  value && !Array.isArray(value) ? value : undefined;

export const helpersFilterQueryParams = (
  filters: DataTableFiltersValues
): HelpersFilterQueryParams => ({
  floor: floorAreas(filters["ha-filter-floor-areas"])?.floors,
  area: floorAreas(filters["ha-filter-floor-areas"])?.areas,
  device: list(filters["ha-filter-devices"]),
  label: list(filters["ha-filter-labels"]),
  category: list(filters["ha-filter-categories"]),
  assistants: list(filters["ha-filter-voice-assistants"]),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, compare equal
export const helpersFilterQueryString = (
  filters: DataTableFiltersValues
): string =>
  createQueryString(
    helpersFilterQueryParams(filters),
    helpersFilterQueryParamConfig
  );

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

  const values = (key: keyof HelpersFilterQueryParams): string[] =>
    params[key]?.filter(Boolean) ?? [];

  const floors = values("floor");
  const areas = values("area");
  const assistants = values("assistants");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-floor-areas":
        floors.length || areas.length ? { floors, areas } : undefined,
      "ha-filter-devices": values("device"),
      "ha-filter-labels": values("label"),
      "ha-filter-categories": values("category"),
      "ha-filter-voice-assistants": assistants.length
        ? assistants
        : values("voice_assistant"),
    },
  };
};
