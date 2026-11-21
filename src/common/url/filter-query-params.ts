import type {
  DataTableFiltersValue,
  FloorAreasFilterValue,
  ListFilterValue,
} from "../../data/data_table_filters";
import {
  hasFilterSelection,
  isExcludeFilter,
  isMatchAllFilter,
  listFilterValue,
} from "../../data/data_table_filters";

// Params shared by the filters of the config tables: the items without an
// area, device, label or category (`no_label=1`), the filters that show
// the items that don't match their selection (`exclude=area,label`), and the
// filters that match the items with every selected id (`match_all=label`).

/**
 * A filter that can show the items that don't match its selection, by the
 * name of its param.
 */
export type ExcludableFilter =
  | "area"
  | "device"
  | "label"
  | "category"
  | "domain"
  | "device_class"
  | "entity_domain"
  | "assistants"
  | "entity"
  | "blueprint"
  | "location";

/**
 * The names of the filters that show the items that don't match their
 * selection. A filter without a selection filters nothing, so it is left out.
 */
export const excludedFilters = (
  filters: Partial<Record<ExcludableFilter, DataTableFiltersValue>>
): ExcludableFilter[] =>
  (Object.keys(filters) as ExcludableFilter[]).filter(
    (name) =>
      hasFilterSelection(filters[name]) && isExcludeFilter(filters[name])
  );

/**
 * A filter that can match the items that have every selected id, by the name
 * of its param.
 */
export type MatchAllFilter =
  "area" | "device" | "entity" | "label" | "assistants" | "location" | "status";

/**
 * The names of the filters that match the items with every selected id. A
 * filter without a selection filters nothing, so it is left out.
 */
export const matchAllFilters = (
  filters: Partial<Record<MatchAllFilter, DataTableFiltersValue>>
): MatchAllFilter[] =>
  (Object.keys(filters) as MatchAllFilter[]).filter(
    (name) =>
      hasFilterSelection(filters[name]) && isMatchAllFilter(filters[name])
  );

const floorAreasValue = (
  value: DataTableFiltersValue
): FloorAreasFilterValue | undefined =>
  value && !Array.isArray(value) ? (value as FloorAreasFilterValue) : undefined;

/** The params of the floor and area filter. */
export const floorAreasFilterParams = (value: DataTableFiltersValue) => {
  const floorAreas = floorAreasValue(value);
  return {
    floor: floorAreas?.floors,
    area: floorAreas?.areas,
    no_area: floorAreas?.no_area,
  };
};

/** The ids a list filter has selected, for its list param. */
export const listFilterIds = (
  value: DataTableFiltersValue
): string[] | undefined => listFilterValue(value)?.ids;

/** Whether a list filter shows the items that have none, for its `no_` param. */
export const listFilterNone = (value: DataTableFiltersValue): boolean =>
  !!listFilterValue(value)?.none;

/** The floor and area filter a link asks for. */
export const floorAreasFilterFromParams = (
  floors: string[],
  areas: string[],
  noArea: boolean | undefined,
  exclude: readonly string[],
  matchAll: readonly string[] = []
): FloorAreasFilterValue | undefined => {
  if (!floors.length && !areas.length && !noArea) {
    return undefined;
  }
  return {
    floors,
    areas,
    ...(noArea ? { no_area: true } : {}),
    ...(exclude.includes("area") ? { exclude: true } : {}),
    ...(matchAll.includes("area") ? { all: true } : {}),
  };
};

/** A list filter a link asks for. */
export const listFilterFromParams = (
  ids: string[],
  none: boolean | undefined,
  exclude: boolean,
  all = false
): ListFilterValue | string[] | undefined => {
  // Only including some ids is a plain list, as the filters send it
  if (!none && !exclude && !all) {
    return ids;
  }
  if (!ids.length && !none) {
    return undefined;
  }
  return {
    ids,
    ...(none ? { none: true } : {}),
    ...(exclude ? { exclude: true } : {}),
    ...(all ? { all: true } : {}),
  };
};
