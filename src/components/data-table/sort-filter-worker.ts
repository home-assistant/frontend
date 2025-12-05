import { expose } from "comlink";
import Fuse, { type FuseOptionKey } from "fuse.js";
import memoizeOne from "memoize-one";
import { ipCompare, stringCompare } from "../../common/string/compare";
import { stripDiacritics } from "../../common/string/strip-diacritics";
import { multiTermSearch } from "../../resources/fuseMultiTerm";
import type {
  ClonedDataTableColumnData,
  DataTableRowData,
  SortableColumnContainer,
  SortingDirection,
} from "./ha-data-table";

const getSearchKeys = memoizeOne(
  (columns: SortableColumnContainer): FuseOptionKey<DataTableRowData>[] => {
    const searchKeys = new Set<string>();

    Object.entries(columns).forEach(([key, column]) => {
      if (column.filterable) {
        searchKeys.add(
          column.filterKey
            ? `${column.valueColumn || key}.${column.filterKey}`
            : key
        );
      }
    });
    return Array.from(searchKeys);
  }
);

const fuseIndex = memoizeOne(
  (data: DataTableRowData[], keys: FuseOptionKey<DataTableRowData>[]) =>
    Fuse.createIndex(keys, data)
);

const filterData = (
  data: DataTableRowData[],
  columns: SortableColumnContainer,
  filter: string
) => {
  filter = stripDiacritics(filter.toLowerCase());

  if (filter === "") {
    return data;
  }

  const keys = getSearchKeys(columns);

  const index = fuseIndex(data, keys);

  return multiTermSearch<DataTableRowData>(data, filter, keys, index, {
    threshold: 0.2, // reduce fuzzy matches in data tables
  });
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
