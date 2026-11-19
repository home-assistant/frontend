import type {
  DataTableFiltersValue,
  DataTableFiltersValues,
} from "../../data/data_table_filters";
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
    // The filters that show the items that don't match their selection
    "exclude",
    // The filters that match the items with every selected id
    "match_all",
  ],
  boolean: [
    { key: "no_area", trueValue: "1" },
    { key: "no_device", trueValue: "1" },
    { key: "no_label", trueValue: "1" },
    { key: "no_device_class", trueValue: "1" },
    { key: "no_assistants", trueValue: "1" },
  ],
} as const satisfies QueryParamConfig;

export type EntitiesFilterQueryParams = QueryParamValues<
  typeof entitiesFilterQueryParamConfig
>;

const list = (value: DataTableFiltersValue): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

export const entitiesFilterQueryParams = (
  filters: DataTableFiltersValues
): EntitiesFilterQueryParams => ({
  status: listFilterIds(filters["ha-filter-states"]),
  ...floorAreasFilterParams(filters["ha-filter-floor-areas"]),
  device: listFilterIds(filters["ha-filter-devices"]),
  no_device: listFilterNone(filters["ha-filter-devices"]),
  device_class: listFilterIds(filters["ha-filter-device-classes"]),
  no_device_class: listFilterNone(filters["ha-filter-device-classes"]),
  domain: listFilterIds(filters["ha-filter-integrations"]),
  entity_domain: listFilterIds(filters["ha-filter-domains"]),
  label: listFilterIds(filters["ha-filter-labels"]),
  no_label: listFilterNone(filters["ha-filter-labels"]),
  assistants: listFilterIds(filters["ha-filter-voice-assistants"]),
  no_assistants: listFilterNone(filters["ha-filter-voice-assistants"]),
  config_entry: list(filters.config_entry),
  sub_entry: list(filters.sub_entry),
  exclude: excludedFilters({
    assistants: filters["ha-filter-voice-assistants"],
    entity_domain: filters["ha-filter-domains"],
    domain: filters["ha-filter-integrations"],
    device_class: filters["ha-filter-device-classes"],
    area: filters["ha-filter-floor-areas"],
    device: filters["ha-filter-devices"],
    label: filters["ha-filter-labels"],
  }),
  match_all: matchAllFilters({
    status: filters["ha-filter-states"],
    label: filters["ha-filter-labels"],
    assistants: filters["ha-filter-voice-assistants"],
  }),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const entitiesFilterQueryString = (
  filters: DataTableFiltersValues
): string => {
  const params = entitiesFilterQueryParams(filters);
  const sorted: EntitiesFilterQueryParams = { ...params };

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

  const values = (
    key: (typeof entitiesFilterQueryParamConfig.list)[number]
  ): string[] => params[key]?.filter(Boolean) ?? [];

  const floors = values("floor");
  const areas = values("area");
  const exclude = values("exclude");
  const matchAll = values("match_all");
  const assistants = values("assistants");

  return {
    search: search ?? "",
    filters: {
      // A cleared status is kept as an empty list, so the default doesn't
      // come back
      "ha-filter-states":
        listFilterFromParams(
          values("status"),
          false,
          false,
          matchAll.includes("status")
        ) ?? [],
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
      "ha-filter-device-classes": listFilterFromParams(
        values("device_class"),
        params.no_device_class,
        exclude.includes("device_class")
      ),
      "ha-filter-integrations": listFilterFromParams(
        values("domain"),
        false,
        exclude.includes("domain")
      ),
      "ha-filter-domains": listFilterFromParams(
        values("entity_domain"),
        false,
        exclude.includes("entity_domain")
      ),
      "ha-filter-labels": listFilterFromParams(
        values("label"),
        params.no_label,
        exclude.includes("label"),
        matchAll.includes("label")
      ),
      "ha-filter-voice-assistants": listFilterFromParams(
        assistants.length ? assistants : values("voice_assistant"),
        params.no_assistants,
        exclude.includes("assistants"),
        matchAll.includes("assistants")
      ),
      config_entry: values("config_entry"),
      sub_entry: values("sub_entry"),
    },
  };
};
