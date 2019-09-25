import { DataTabelColumnContainer, DataTabelRowData } from "./ha-data-table";

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
