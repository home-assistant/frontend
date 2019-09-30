import {
  DataTabelColumnContainer,
  DataTabelColumnData,
  DataTabelRowData,
  SortingDirection,
} from "./ha-data-table";

import memoizeOne from "memoize-one";

export const filterSortData = memoizeOne(
  async (
    data: DataTabelRowData[],
    columns: DataTabelColumnContainer,
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
    data: DataTabelRowData[],
    columns: DataTabelColumnContainer,
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
    data: DataTabelRowData[],
    columns: DataTabelColumnContainer,
    direction: SortingDirection,
    sortColumn: string
  ) => {
    return sortData(data, columns[sortColumn], direction, sortColumn);
  }
);

export const filterData = (
  data: DataTabelRowData[],
  columns: DataTabelColumnContainer,
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
  data: DataTabelRowData[],
  column: DataTabelColumnData,
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
