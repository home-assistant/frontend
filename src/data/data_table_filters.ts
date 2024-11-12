export interface DataTableFilters {
  [key: string]: {
    value: DataTableFiltersValue;
    items: Set<string> | undefined;
  };
}

export type DataTableFiltersValue = string[] | { key: string[] } | undefined;

export interface DataTableFiltersValues {
  [key: string]: DataTableFiltersValue;
}

export interface DataTableFiltersItems {
  [key: string]: Set<string> | undefined;
}

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
