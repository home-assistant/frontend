import { arrayWith, arrayWithout } from "../common/array/array-with";

export interface DataTableFilter {
  value: DataTableFiltersValue;
  items: Set<string> | undefined;
}

export type DataTableFilters = Record<string, DataTableFilter>;

export interface FloorAreasFilterValue {
  floors?: string[];
  areas?: string[];
  no_area?: boolean;
  /** Show the items that don't match the selection */
  exclude?: boolean;
}

/**
 * Value of a filter that picks from a list, such as labels, devices or
 * categories.
 */
export interface ListFilterValue {
  ids?: string[];
  /** Also match the items that have none */
  none?: boolean;
  /** Show the items that don't match the selection */
  exclude?: boolean;
  /**
   * Match the items that have every selected id, instead of one of them. Only
   * filters whose items can have several ids, such as labels, offer this.
   */
  all?: boolean;
}

/** The keys of a filter value that pick how it matches, not what. */
const FILTER_MODE_KEYS = new Set(["exclude", "all"]);

/** Whether a floor of the floor and area filter is picked, partly or not. */
export type FloorSelection = "all" | "some" | "none";

/**
 * Whether a floor is picked. A picked floor stands for all its areas, so a
 * floor whose areas are all picked counts as picked too.
 */
export const floorSelection = (
  value: FloorAreasFilterValue | undefined,
  floorId: string,
  areaIds: readonly string[]
): FloorSelection => {
  if (value?.floors?.includes(floorId)) {
    return "all";
  }
  const picked = areaIds.filter((id) => value?.areas?.includes(id)).length;
  if (!picked) {
    return "none";
  }
  return picked === areaIds.length ? "all" : "some";
};

/**
 * The floor and area filter after a floor or area is ticked or unticked.
 *
 * A ticked floor stands for all its areas, so ticking a floor drops its areas
 * from the list. Unticking one area of a ticked floor keeps its other areas,
 * and ticking the last area of a floor picks the floor instead.
 *
 * @param floorAreas - The area ids of each floor, by floor id
 */
export const toggleFloorArea = (
  value: FloorAreasFilterValue | undefined,
  floorAreas: Readonly<Record<string, readonly string[]>>,
  type: "floors" | "areas",
  id: string,
  selected: boolean
): FloorAreasFilterValue => {
  let floors = value?.floors ?? [];
  let areas = value?.areas ?? [];

  if (type === "floors") {
    const floorAreaIds = floorAreas[id] ?? [];
    areas = areas.filter((areaId) => !floorAreaIds.includes(areaId));
    floors = selected ? arrayWith(floors, id) : arrayWithout(floors, id);
    return { ...value, floors, areas };
  }

  const floorId = Object.keys(floorAreas).find((floor) =>
    floorAreas[floor].includes(id)
  );
  const siblings = floorId ? floorAreas[floorId] : [];

  if (selected) {
    areas = arrayWith(areas, id);
    if (floorId && siblings.every((areaId) => areas.includes(areaId))) {
      floors = arrayWith(floors, floorId);
      areas = areas.filter((areaId) => !siblings.includes(areaId));
    }
  } else if (floorId && floors.includes(floorId)) {
    // Older values can list the floor and some of its areas, so drop the
    // floor's areas before adding all of them but the unticked one.
    floors = arrayWithout(floors, floorId);
    areas = [
      ...areas.filter((areaId) => !siblings.includes(areaId)),
      ...siblings.filter((areaId) => areaId !== id),
    ];
  } else {
    areas = arrayWithout(areas, id);
  }

  return { ...value, floors, areas };
};

export type DataTableFiltersValue =
  | string[]
  | Record<"key" | string, string[]>
  | FloorAreasFilterValue
  | ListFilterValue
  | undefined;

export type DataTableFiltersValues = Record<string, DataTableFiltersValue>;

export type DataTableFiltersItems = Record<string, Set<string> | undefined>;

export const serializeFilters = (value: DataTableFilters) => {
  const serializedValue = {};
  Object.entries(value).forEach(([key, val]) => {
    serializedValue[key] = {
      value: val.value,
      items: val.items instanceof Set ? Array.from(val.items) : val.items,
    };
  });
  return serializedValue;
};

export const deserializeFilters = (value: DataTableFilters) => {
  const deserializedValue = {};
  Object.entries(value).forEach(([key, val]) => {
    deserializedValue[key] = {
      value: val.value,
      items: Array.isArray(val.items) ? new Set(val.items) : val.items,
    };
  });
  return deserializedValue;
};

/**
 * The value of a list filter. Filters used to keep their selected ids as a
 * plain list, which stored filters can still hold.
 */
export const listFilterValue = (
  value: DataTableFiltersValue
): ListFilterValue | undefined => {
  if (Array.isArray(value)) {
    return value.length ? { ids: value } : undefined;
  }
  return value && typeof value === "object"
    ? (value as ListFilterValue)
    : undefined;
};

/**
 * The value a list filter sends to the page. Only including some ids sends
 * them as a plain list, which pages that don't use the mode read as well.
 */
export const listFilterEventValue = (
  value: ListFilterValue
): DataTableFiltersValue => {
  if (!hasFilterSelection(value)) {
    // The modes are kept, so they stay picked when the selection is cleared
    const modes = {
      ...(value.exclude ? { exclude: true } : {}),
      ...(value.all ? { all: true } : {}),
    };
    return Object.keys(modes).length ? modes : undefined;
  }
  if (!value.none && !value.exclude && !value.all) {
    return value.ids;
  }
  return value;
};

/** Whether a filter value has anything selected, so it filters the list. */
export const hasFilterSelection = (value: DataTableFiltersValue): boolean => {
  if (!value) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  // The modes only apply to a selection, on their own they filter nothing
  return Object.entries(value).some(([key, val]) =>
    FILTER_MODE_KEYS.has(key)
      ? false
      : Array.isArray(val)
        ? val.length > 0
        : !!val
  );
};

/** Whether a filter value shows the items that don't match its selection. */
export const isExcludeFilter = (value: DataTableFiltersValue): boolean =>
  !!value && !Array.isArray(value) && "exclude" in value && !!value.exclude;

/**
 * A list filter after options are ticked or unticked. An item can't have none
 * and some at once, so while matching all, ticking the none option unticks
 * the ids and ticking an id unticks the none option.
 */
export const toggleListFilterIds = (
  value: ListFilterValue | undefined,
  ids: readonly string[],
  selected: boolean
): ListFilterValue => ({
  ...value,
  ids: ids.reduce(
    (result, id) =>
      selected ? arrayWith(result, id) : arrayWithout(result, id),
    value?.ids
  ),
  ...(selected && value?.all ? { none: false } : {}),
});

/** A list filter after its none option is ticked or unticked. */
export const toggleListFilterNone = (
  value: ListFilterValue | undefined,
  selected: boolean
): ListFilterValue => ({
  ...value,
  none: selected,
  ...(selected && value?.all ? { ids: [] } : {}),
});

/**
 * A list filter after picking whether it matches any or all of its ids.
 * Matching all keeps the ids and unticks the none option, which can't go
 * with them.
 */
export const setListFilterAll = (
  value: ListFilterValue | undefined,
  all: boolean
): ListFilterValue => ({
  ...value,
  all,
  ...(all && value?.ids?.length ? { none: false } : {}),
});

/** Whether a list filter matches the items that have every selected id. */
export const isMatchAllFilter = (value: DataTableFiltersValue): boolean =>
  !!listFilterValue(value)?.all;

/** The number of filters that have anything selected. */
export const countActiveFilters = (
  values: Iterable<DataTableFiltersValue>
): number => [...values].filter(hasFilterSelection).length;

/**
 * Whether an item with the given ids (such as its labels) passes a list
 * filter. Without a selection every item passes. Matching all needs every
 * selected id, and the none option then only matches when it is the only
 * thing selected, as an item can't have none and some at once.
 */
export const matchesListFilter = (
  value: DataTableFiltersValue,
  itemIds: readonly (string | null | undefined)[] | undefined
): boolean => {
  const filter = listFilterValue(value);
  if (!filter || !hasFilterSelection(filter)) {
    return true;
  }
  const ids = itemIds?.filter((id): id is string => !!id) ?? [];
  const matches = filter.all
    ? (!filter.none || !ids.length) &&
      (filter.ids ?? []).every((id) => ids.includes(id))
    : (!!filter.none && !ids.length) ||
      ids.some((id) => filter.ids?.includes(id));
  return filter.exclude ? !matches : matches;
};

/**
 * Whether an item passes a filter that worked out the items matching its
 * selection.
 */
export const matchesFilterItems = (
  value: DataTableFiltersValue,
  items: Set<string>,
  id: string
): boolean => items.has(id) !== isExcludeFilter(value);

// returns true when this filter has *selected* options and the filter's name
// equals the given filterName
export const isFilterUsed = (
  key: string,
  filter: DataTableFilter,
  filterName: string
): boolean => key === filterName && hasFilterSelection(filter.value);

// returns true when this filter has *selected* options
// which has resulted in a list of items that match these selected opions
// (this list can be empty),
// and the filter's name equals (one of) the given filterName(s)
export const isRelatedItemsFilterUsed = (
  key: string,
  filter: DataTableFilter,
  filterName: string | string[]
) => {
  const isUsed =
    (key === filterName || filterName.includes(key)) && filter.items;
  return isUsed;
};
