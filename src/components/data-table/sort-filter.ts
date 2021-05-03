import { Remote, wrap } from "comlink";
import type { Api } from "./sort_filter_worker";

type FilterDataType = Api["filterData"];
type FilterDataParamTypes = Parameters<FilterDataType>;

type SortDataType = Api["sortData"];
type SortDataParamTypes = Parameters<SortDataType>;

let worker: Remote<Api> | undefined;

export const filterData = async (
  data: FilterDataParamTypes[0],
  columns: FilterDataParamTypes[1],
  filter: FilterDataParamTypes[2]
): Promise<ReturnType<FilterDataType>> => {
  if (!worker) {
    worker = wrap(new Worker(new URL("./sort_filter_worker", import.meta.url)));
  }

  return worker.filterData(data, columns, filter);
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

  return worker.sortData(data, columns, direction, sortColumn);
};
