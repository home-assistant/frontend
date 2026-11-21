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

// The filters of the automations table. Search, sorting and grouping are kept
// by the data table, see data-table-query-params.
export const automationsFilterQueryParamConfig = {
  list: [
    "floor",
    "area",
    "device",
    "entity",
    "label",
    "category",
    "assistants",
    "blueprint",
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
    { key: "no_blueprint", trueValue: "1" },
  ],
} as const satisfies QueryParamConfig;

export type AutomationsFilterQueryParams = QueryParamValues<
  typeof automationsFilterQueryParamConfig
>;

export const automationsFilterQueryParams = (
  filters: DataTableFilters
): AutomationsFilterQueryParams => ({
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
  blueprint: listFilterIds(filters["ha-filter-blueprints"]?.value),
  no_blueprint: listFilterNone(filters["ha-filter-blueprints"]?.value),
  exclude: excludedFilters({
    blueprint: filters["ha-filter-blueprints"]?.value,
    assistants: filters["ha-filter-voice-assistants"]?.value,
    entity: filters["ha-filter-entities"]?.value,
    area: filters["ha-filter-floor-areas"]?.value,
    device: filters["ha-filter-devices"]?.value,
    label: filters["ha-filter-labels"]?.value,
    category: filters["ha-filter-categories"]?.value,
  }),
  match_all: matchAllFilters({
    area: filters["ha-filter-floor-areas"]?.value,
    device: filters["ha-filter-devices"]?.value,
    entity: filters["ha-filter-entities"]?.value,
    label: filters["ha-filter-labels"]?.value,
    assistants: filters["ha-filter-voice-assistants"]?.value,
  }),
});

// The filters as the URL holds them, so values that filter the same, such as
// no list and an empty one, or a list in another order, compare equal. A
// filter list sends back what it was given in its own order.
export const automationsFilterQueryString = (
  filters: DataTableFilters
): string => {
  const params = automationsFilterQueryParams(filters);
  const sorted: AutomationsFilterQueryParams = { ...params };

  for (const key of automationsFilterQueryParamConfig.list) {
    sorted[key] = params[key] && [...params[key]].sort();
  }

  return createQueryString(sorted, automationsFilterQueryParamConfig);
};

// What a link says to show, undefined when it has no table params so what was
// picked before stays. A link replaces the search and the filters, ones left
// behind would hide part of what it shows. The table applies its sorting and
// grouping. The filters work out their items from the values.
export interface AutomationsLink {
  search: string;
  filters: DataTableFilters;
}

export const automationsLinkFromUrl = (
  searchParams: SearchParamsSource
): AutomationsLink | undefined => {
  if (
    !hasQueryParams(searchParams, automationsFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const params = decodeQueryParams(
    searchParams,
    automationsFilterQueryParamConfig
  );

  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  const values = (
    key: (typeof automationsFilterQueryParamConfig.list)[number]
  ): string[] => params[key]?.filter(Boolean) ?? [];

  const filter = (value: DataTableFilter["value"]): DataTableFilter => ({
    value,
    items: undefined,
  });

  const floors = values("floor");
  const areas = values("area");
  const exclude = values("exclude");
  const matchAll = values("match_all");

  return {
    search: search ?? "",
    filters: {
      "ha-filter-floor-areas": filter(
        floorAreasFilterFromParams(
          floors,
          areas,
          params.no_area,
          exclude,
          matchAll
        )
      ),
      "ha-filter-devices": filter(
        listFilterFromParams(
          values("device"),
          params.no_device,
          exclude.includes("device"),
          matchAll.includes("device")
        )
      ),
      "ha-filter-entities": filter(
        listFilterFromParams(
          values("entity"),
          false,
          exclude.includes("entity"),
          matchAll.includes("entity")
        )
      ),
      "ha-filter-labels": filter(
        listFilterFromParams(
          values("label"),
          params.no_label,
          exclude.includes("label"),
          matchAll.includes("label")
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
          exclude.includes("assistants"),
          matchAll.includes("assistants")
        )
      ),
      "ha-filter-blueprints": filter(
        listFilterFromParams(
          values("blueprint"),
          params.no_blueprint,
          exclude.includes("blueprint")
        )
      ),
    },
  };
};
