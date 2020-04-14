import memoizeOne from "memoize-one";
// eslint-disable-next-line import/no-cycle
import {
  DataTableColumnContainer,
  DataTableColumnData,
  DataTableRowData,
  SortingDirection,
} from "./ha-data-table";

export const filterSortData = memoizeOne(
  async (
    data: DataTableRowData[],
    columns: DataTableColumnContainer,
    filter: string,
    direction: SortingDirection,
    sortColumn?: string
  ) =>
    sortColumn
      ? _memSortData(
          await _memFilterData(data, columns, filter),
          columns,
          direction,
          sortColumn
        )
      : _memFilterData(data, columns, filter)
);

const _memFilterData = memoizeOne(
  async (
    data: DataTableRowData[],
    columns: DataTableColumnContainer,
    filter: string
  ) => {
    if (!filter) {
      return data;
    }
    return filterData(data, columns, filter.toUpperCase());
  }
);

const _memSortData = memoizeOne(
  (
    data: DataTableRowData[],
    columns: DataTableColumnContainer,
    direction: SortingDirection,
    sortColumn: string
  ) => {
    return sortData(data, columns[sortColumn], direction, sortColumn);
  }
);

export const filterData = (
  data: DataTableRowData[],
  columns: DataTableColumnContainer,
  filter: string
) =>
  data.filter((row) => {
    return Object.entries(columns).some((columnEntry) => {
      const [key, column] = columnEntry;
      if (column.filterable) {
        if (
          (column.filterKey ? row[key][column.filterKey] : row[key])
            .toUpperCase()
            .includes(filter)
        ) {
          return true;
        }
      }
      return false;
    });
  });

export const sortData = (
  data: DataTableRowData[],
  column: DataTableColumnData,
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

    if (valA < valB) {
      return sort * -1;
    }
    if (valA > valB) {
      return sort * 1;
    }
    return 0;
  });
