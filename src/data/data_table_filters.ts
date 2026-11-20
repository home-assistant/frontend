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
}

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
    // The mode is kept, so it stays picked when the selection is cleared
    return value.exclude ? { exclude: true } : undefined;
  }
  if (!value.none && !value.exclude) {
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
  // The mode only applies to a selection, on its own it filters nothing
  return Object.entries(value).some(([key, val]) =>
    key === "exclude" ? false : Array.isArray(val) ? val.length > 0 : !!val
  );
};

/** Whether a filter value shows the items that don't match its selection. */
export const isExcludeFilter = (value: DataTableFiltersValue): boolean =>
  !!value && !Array.isArray(value) && "exclude" in value && !!value.exclude;

/**
 * Whether a filter switched between showing the items that match its
 * selection and the ones that don't. The URL leaves out the mode of a filter
 * without a selection, so pages can't tell this change from the URL alone.
 */
export const filterModeChanged = (
  value: DataTableFiltersValue,
  previous: DataTableFiltersValue
): boolean => isExcludeFilter(value) !== isExcludeFilter(previous);

/** The number of filters that have anything selected. */
export const countActiveFilters = (
  values: Iterable<DataTableFiltersValue>
): number => [...values].filter(hasFilterSelection).length;

/**
 * Whether an item with the given ids (such as its labels) passes a list
 * filter. Without a selection every item passes.
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
  const matches =
    (!!filter.none && !ids.length) ||
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
