// To use comlink under ES5
import { expose } from "comlink";
import "proxy-polyfill";
import { stringCompare } from "../../common/string/compare";
import type {
  ClonedDataTableColumnData,
  DataTableRowData,
  SortableColumnContainer,
  SortingDirection,
} from "./ha-data-table";

const filterData = (
  data: DataTableRowData[],
  columns: SortableColumnContainer,
  filter: string
) => {
  filter = filter.toUpperCase();
  return data.filter((row) =>
    Object.entries(columns).some((columnEntry) => {
      const [key, column] = columnEntry;
      if (column.filterable) {
        if (
          String(
            column.filterKey
              ? row[column.valueColumn || key][column.filterKey]
              : row[column.valueColumn || key]
          )
            .toUpperCase()
            .includes(filter)
        ) {
          return true;
        }
      }
      return false;
    })
  );
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
