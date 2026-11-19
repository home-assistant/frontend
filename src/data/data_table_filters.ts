export interface DataTableFilter {
  value: DataTableFiltersValue;
  items: Set<string> | undefined;
}

export type DataTableFilters = Record<string, DataTableFilter>;

export interface FloorAreasFilterValue {
  floors?: string[];
  areas?: string[];
  no_area?: boolean;
}

export type DataTableFiltersValue =
  | string[]
  | Record<"key" | string, string[]>
  | FloorAreasFilterValue
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

// returns true when this filter has *selected* options and the filter's name
// equals the given filterName
export const isFilterUsed = (
  key: string,
  filter: DataTableFilter,
  filterName: string
): number | false => {
  const isUsed =
    key === filterName && Array.isArray(filter.value) && filter.value.length;
  return isUsed;
};

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

/**
 * Whether an item with nothing assigned (no area, device, label, category or
 * assistant) passes the filters: only a "No area" selection keeps it, any
 * selected id leaves it out.
 */
export const filtersMatchUnassignedItem = (
  filters: DataTableFiltersValues
): boolean =>
  Object.values(filters).every((value) => {
    if (!value) {
      return true;
    }
    if (Array.isArray(value)) {
      return !value.length;
    }
    if ((value as FloorAreasFilterValue).no_area) {
      return true;
    }
    return Object.values(value).every(
      (selected) => !Array.isArray(selected) || !selected.length
    );
  });
