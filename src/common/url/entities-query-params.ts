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

// The filters of the entities table. Search, sorting and grouping are kept
// by the data table, see data-table-query-params.
export const entitiesFilterQueryParamConfig = {
  list: [
    "status",
    "floor",
    "area",
    "device",
    "device_class",
    "domain",
    "entity_domain",
    "label",
    "assistants",
    "config_entry",
    "sub_entry",
    // Read until 2027.5, replaced with `assistants` on the next write
    "voice_assistant",
  ],
} as const satisfies QueryParamConfig;

export type EntitiesFilterQueryParams = QueryParamValues<
  typeof entitiesFilterQueryParamConfig
>;

const list = (value: DataTableFiltersValue): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

const floorAreas = (
  value: DataTableFiltersValue
): Record<string, string[]> | undefined =>
  value && !Array.isArray(value) ? value : undefined;

export const entitiesFilterQueryParams = (
  filters: DataTableFiltersValues
): EntitiesFilterQueryParams => ({
  status: list(filters["ha-filter-states"]),
  floor: floorAreas(filters["ha-filter-floor-areas"])?.floors,
  area: floorAreas(filters["ha-filter-floor-areas"])?.areas,
  device: list(filters["ha-filter-devices"]),
  device_class: list(filters["ha-filter-device-classes"]),
  domain: list(filters["ha-filter-integrations"]),
  entity_domain: list(filters["ha-filter-domains"]),
  label: list(filters["ha-filter-labels"]),
  assistants: list(filters["ha-filter-voice-assistants"]),
  config_entry: list(filters.config_entry),
  sub_entry: list(filters.sub_entry),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const entitiesFilterQueryString = (
  filters: DataTableFiltersValues
): string => {
  const params = entitiesFilterQueryParams(filters);
  const sorted: EntitiesFilterQueryParams = {};

  for (const key of entitiesFilterQueryParamConfig.list) {
    sorted[key] = params[key] && [...params[key]].sort();
  }

  return createQueryString(sorted, entitiesFilterQueryParamConfig);
};

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping.
export interface EntitiesLink {
  search: string;
  filters: DataTableFiltersValues;
}

export const entitiesLinkFromUrl = (
  searchParams: SearchParamsSource
): EntitiesLink | undefined => {
  if (
    !hasQueryParams(searchParams, entitiesFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(
    searchParams,
    entitiesFilterQueryParamConfig
  );

  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  const values = (key: keyof EntitiesFilterQueryParams): string[] =>
    params[key]?.filter(Boolean) ?? [];

  const floors = values("floor");
  const areas = values("area");
  const assistants = values("assistants");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-states": values("status"),
      "ha-filter-floor-areas":
        floors.length || areas.length ? { floors, areas } : undefined,
      "ha-filter-devices": values("device"),
      "ha-filter-device-classes": values("device_class"),
      "ha-filter-integrations": values("domain"),
      "ha-filter-domains": values("entity_domain"),
      "ha-filter-labels": values("label"),
      "ha-filter-voice-assistants": assistants.length
        ? assistants
        : values("voice_assistant"),
      config_entry: values("config_entry"),
      sub_entry: values("sub_entry"),
    },
  };
};
