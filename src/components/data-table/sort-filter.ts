import { wrap } from "comlink";
import type { api } from "./sort_filter_worker";

type FilterDataType = api["filterData"];
type FilterDataParamTypes = Parameters<FilterDataType>;

type SortDataType = api["sortData"];
type SortDataParamTypes = Parameters<SortDataType>;

let worker: any | undefined;

export const filterData = async (
  data: FilterDataParamTypes[0],
  columns: FilterDataParamTypes[1],
  filter: FilterDataParamTypes[2]
): Promise<ReturnType<FilterDataType>> => {
  if (!worker) {
    worker = wrap(new Worker(new URL("./sort_filter_worker", import.meta.url)));
  }

  return await worker.filterData(data, columns, filter);
};

export const sortData = async (
  data: SortDataParamTypes[0],
  columns: SortDataParamTypes[1],
  direction: SortDataParamTypes[2],
  sortColumn: SortDataParamTypes[3]
): Promise<ReturnType<SortDataType>> => {
  if (!worker) {
    worker = wrap(new Worker(new URL("./sort_filter_worker", import.meta.url)));
  }

  return await worker.sortData(data, columns, direction, sortColumn);
};
