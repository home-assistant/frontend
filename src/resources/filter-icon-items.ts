import { Remote, wrap } from "comlink";
import type { Api } from "./icon-worker";

type FilterIconItemsType = Api["filterIconItems"];
type FilterIconItemsParamTypes = Parameters<FilterIconItemsType>;

let worker: Remote<Api> | undefined;

export const filterIconItems = async (
  ...arg: FilterIconItemsParamTypes
): Promise<ReturnType<FilterIconItemsType>> => {
  if (!worker) {
    worker = wrap(new Worker(new URL("./icon-worker", import.meta.url)));
  }

  return worker.filterIconItems(...arg);
};
