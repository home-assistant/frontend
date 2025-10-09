import { expose } from "comlink";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import { ipCompare, stringCompare } from "../../common/string/compare";
import { stripDiacritics } from "../../common/string/strip-diacritics";
import { HaFuse } from "../../resources/fuse";
import type {
  ClonedDataTableColumnData,
  DataTableRowData,
  SortableColumnContainer,
  SortingDirection,
} from "./ha-data-table";

const fuseIndex = memoizeOne(
  (data: DataTableRowData[], columns: SortableColumnContainer) => {
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
    return Fuse.createIndex([...searchKeys], data);
  }
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

  const index = fuseIndex(data, columns);

  const fuse = new HaFuse(
    data,
    { shouldSort: false, minMatchCharLength: 1 },
    index
  );

  const searchResults = fuse.multiTermsSearch(filter);

  if (searchResults) {
    return searchResults.map((result) => result.item);
  }

  return data;
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
