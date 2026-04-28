import { expose } from "comlink";
import type { FuseOptionKey, IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import { ipCompare, stringCompare } from "../../common/string/compare";
import { stripDiacritics } from "../../common/string/strip-diacritics";
import type {
  ClonedDataTableColumnData,
  DataTableRowData,
  SortableColumnContainer,
  SortingDirection,
} from "./ha-data-table";

interface FilterKeyConfig {
  key: string;
  filterKey?: string;
}

const getFilterKeys = memoizeOne(
  (columns: SortableColumnContainer): FilterKeyConfig[] =>
    Object.entries(columns)
      .filter(([, column]) => column.filterable)
      .map(([key, column]) => ({
        key: column.valueColumn || key,
        filterKey: column.filterKey,
      }))
);

const getSearchableValue = (
  row: DataTableRowData,
  { key, filterKey }: FilterKeyConfig
): string => {
  let value = row[key];

  if (value == null) {
    return "";
  }

  if (filterKey && typeof value === "object" && !Array.isArray(value)) {
    value = value[filterKey];
    if (value == null) {
      return "";
    }
  }

  if (Array.isArray(value)) {
    const stringValues = value
      .filter((item) => item != null && typeof item !== "object")
      .map(String);
    return stripDiacritics(stringValues.join(" ").toLowerCase());
  }

  return stripDiacritics(String(value).toLowerCase());
};

/** Filters data using exact substring matching (all terms must match). */
const filterDataExact = (
  data: DataTableRowData[],
  filterKeys: FilterKeyConfig[],
  terms: string[]
): DataTableRowData[] => {
  if (terms.length === 1) {
    const term = terms[0];
    return data.filter((row) =>
      filterKeys.some((config) =>
        getSearchableValue(row, config).includes(term)
      )
    );
  }

  return data.filter((row) => {
    const searchString = filterKeys
      .map((config) => getSearchableValue(row, config))
      .join(" ");
    return terms.every((term) => searchString.includes(term));
  });
};

const FUZZY_OPTIONS: IFuseOptions<DataTableRowData> = {
  ignoreDiacritics: true,
  isCaseSensitive: false,
  threshold: 0.2, // Stricter than default 0.3
  minMatchCharLength: 2,
  ignoreLocation: true,
  shouldSort: false,
};

interface FuseKeyConfig {
  name: string | string[];
  getFn: (row: DataTableRowData) => string;
}

/** Filters data using fuzzy matching with Fuse.js (all terms must match). */
const filterDataFuzzy = (
  data: DataTableRowData[],
  filterKeys: FilterKeyConfig[],
  terms: string[]
): DataTableRowData[] => {
  // Build Fuse.js search keys from filter keys
  const fuseKeys: FuseKeyConfig[] = filterKeys.map((config) => ({
    name: config.filterKey ? [config.key, config.filterKey] : config.key,
    getFn: (row: DataTableRowData) => getSearchableValue(row, config),
  }));

  // Find minimum term length to adjust minMatchCharLength
  const minTermLength = Math.min(...terms.map((t) => t.length));
  const minMatchCharLength = Math.min(minTermLength, 2);

  const fuse = new Fuse<DataTableRowData>(data, {
    ...FUZZY_OPTIONS,
    keys: fuseKeys as FuseOptionKey<DataTableRowData>[],
    minMatchCharLength,
  });

  // For single term, simple search
  if (terms.length === 1) {
    return fuse.search(terms[0]).map((r) => r.item);
  }

  // For multiple terms, all must match (AND logic)
  const expression = {
    $and: terms.map((term) => ({
      $or: fuseKeys.map((key) => ({
        $path: Array.isArray(key.name) ? key.name : [key.name],
        $val: term,
      })),
    })),
  };

  return fuse.search(expression).map((r) => r.item);
};

/**
 * Filters data with exact match priority and fuzzy fallback.
 * - First tries exact substring matching
 * - If exact matches found, returns only those
 * - If no exact matches, falls back to fuzzy search with strict scoring
 */
const filterData = (
  data: DataTableRowData[],
  columns: SortableColumnContainer,
  filter: string
): DataTableRowData[] => {
  const normalizedFilter = stripDiacritics(filter.toLowerCase().trim());

  if (!normalizedFilter) {
    return data;
  }

  const filterKeys = getFilterKeys(columns);

  if (!filterKeys.length) {
    return data;
  }

  const terms = normalizedFilter.split(/\s+/);

  // First, try exact substring matching
  const exactMatches = filterDataExact(data, filterKeys, terms);

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // No exact matches, fall back to fuzzy search
  return filterDataFuzzy(data, filterKeys, terms);
};

const sortData = (
  data: DataTableRowData[],
  column: ClonedDataTableColumnData,
  direction: SortingDirection,
  sortColumn: string,
  language?: string
) =>
  data.sort((a, b) => {
    let sort = 1;
    if (direction === "desc") {
      sort = -1;
    }

    let valA = column.filterKey
      ? a[column.valueColumn || sortColumn][column.filterKey]
      : a[column.valueColumn || sortColumn];

    let valB = column.filterKey
      ? b[column.valueColumn || sortColumn][column.filterKey]
      : b[column.valueColumn || sortColumn];

    if (column.type === "numeric") {
      valA = isNaN(valA) ? undefined : Number(valA);
      valB = isNaN(valB) ? undefined : Number(valB);
    } else if (column.type === "ip") {
      return sort * ipCompare(valA, valB);
    } else if (typeof valA === "string" && typeof valB === "string") {
      return sort * stringCompare(valA, valB, language);
    }

    // Ensure "undefined" and "null" are always sorted to the bottom
    if (valA == null && valB != null) {
      return 1;
    }
    if (valB == null && valA != null) {
      return -1;
    }

    if (valA < valB) {
      return sort * -1;
    }
    if (valA > valB) {
      return sort * 1;
    }
    return 0;
  });

const api = {
  filterData,
  sortData,
};

export type Api = typeof api;

expose(api);
