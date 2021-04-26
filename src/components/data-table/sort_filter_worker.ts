// To use comlink under ES5
import { expose } from "comlink";
import "proxy-polyfill";
import type {
  DataTableRowData,
  DataTableSortColumnData,
  SortableColumnContainer,
  SortingDirection,
} from "./ha-data-table";

const filterData = (
  data: DataTableRowData[],
  columns: SortableColumnContainer,
  filter: string
) => {
  filter = filter.toUpperCase();
  return data.filter((row) => {
    return Object.entries(columns).some((columnEntry) => {
      const [key, column] = columnEntry;
      if (column.filterable) {
        if (
          String(column.filterKey ? row[key][column.filterKey] : row[key])
            .toUpperCase()
            .includes(filter)
        ) {
          return true;
        }
      }
      return false;
    });
  });
};

const sortData = (
  data: DataTableRowData[],
  column: DataTableSortColumnData,
  direction: SortingDirection,
  sortColumn: string
) =>
  data.sort((a, b) => {
    let sort = 1;
    if (direction === "desc") {
      sort = -1;
    }

    let valA = column.filterKey
      ? a[sortColumn][column.filterKey]
      : a[sortColumn];

    let valB = column.filterKey
      ? b[sortColumn][column.filterKey]
      : b[sortColumn];

    if (typeof valA === "string") {
      valA = valA.toUpperCase();
    }
    if (typeof valB === "string") {
      valB = valB.toUpperCase();
    }

    // Ensure "undefined" is always sorted to the bottom
    if (valA === undefined && valB !== undefined) {
      return 1;
    }
    if (valB === undefined && valA !== undefined) {
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

export type api = typeof api;

expose(api);
