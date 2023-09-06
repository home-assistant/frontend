import { Remote, wrap } from "comlink";
import type { Api } from "./sort-filter-worker";

type FilterDataType = Api["filterData"];
type FilterDataParamTypes = Parameters<FilterDataType>;

type SortDataType = Api["sortData"];
type SortDataParamTypes = Parameters<SortDataType>;

let worker: Remote<Api> | undefined;

const getWorker = () => {
  if (!worker) {
    worker = wrap(
      new Worker(
        /* webpackChunkName: "sort-filter-worker" */
        new URL("./sort-filter-worker", import.meta.url)
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
  sortColumn: SortDataParamTypes[3],
  language?: SortDataParamTypes[4]
): Promise<ReturnType<SortDataType>> =>
  getWorker().sortData(data, columns, direction, sortColumn, language);
