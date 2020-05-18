import { wrap } from "comlink";

type FilterSortDataType = typeof import("./sort_filter_worker").api["filterSortData"];
type filterSortDataParamTypes = Parameters<FilterSortDataType>;

let worker: any | undefined;

export const filterSortData = async (
  data: filterSortDataParamTypes[0],
  columns: filterSortDataParamTypes[1],
  filter: filterSortDataParamTypes[2],
  direction: filterSortDataParamTypes[3],
  sortColumn: filterSortDataParamTypes[4]
): Promise<ReturnType<FilterSortDataType>> => {
  if (!worker) {
    worker = wrap(new Worker("./sort_filter_worker", { type: "module" }));
  }

  return await worker.filterSortData(
    data,
    columns,
    filter,
    direction,
    sortColumn
  );
};
