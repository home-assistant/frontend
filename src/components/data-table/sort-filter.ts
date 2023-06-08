import { Remote, wrap } from "comlink";
import type { Api } from "./sort_filter_worker";

type FilterDataType = Api["filterData"];
type FilterDataParamTypes = Parameters<FilterDataType>;

type SortDataType = Api["sortData"];
type SortDataParamTypes = Parameters<SortDataType>;

let worker: Remote<Api> | undefined;

const getWorker = () => {
  if (!worker) {
    worker = wrap(
      new Worker(
        /* webpackChunkName: "sort_filter_worker" */
        new URL("./sort_filter_worker", import.meta.url)
      )
    );
  }
  return worker;
};

export const filterData = (
  data: FilterDataParamTypes[0],
  columns: FilterDataParamTypes[1],
  filter: FilterDataParamTypes[2]
): Promise<ReturnType<FilterDataType>> =>
  getWorker().filterData(data, columns, filter);
export const sortData = (
  data: SortDataParamTypes[0],
  columns: SortDataParamTypes[1],
  direction: SortDataParamTypes[2],
  sortColumn: SortDataParamTypes[3]
): Promise<ReturnType<SortDataType>> =>
  getWorker().sortData(data, columns, direction, sortColumn);
