import type { HassServiceTarget } from "home-assistant-js-websocket";
import {
  createQueryString,
  decodeQueryParams,
  queryParamsFromServiceTarget,
  serviceTargetFromQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

export type HistoryLogbookTargetParamKey =
  "entity_id" | "label_id" | "floor_id" | "area_id" | "device_id";

export const historyLogbookTargetParamKeys: readonly HistoryLogbookTargetParamKey[] =
  ["entity_id", "label_id", "floor_id", "area_id", "device_id"];

export const historyLogbookQueryParamConfig = {
  list: historyLogbookTargetParamKeys,
  date: ["start_date", "end_date"],
  boolean: [{ key: "back", trueValue: "1" }],
} as const satisfies QueryParamConfig;

export type HistoryLogbookQueryParams = QueryParamValues<
  typeof historyLogbookQueryParamConfig
>;

export const decodeHistoryLogbookQueryParams = (
  searchParams: SearchParamsSource
): HistoryLogbookQueryParams =>
  decodeQueryParams(searchParams, historyLogbookQueryParamConfig);

export const historyLogbookTargetFromQueryParams = (
  params: HistoryLogbookQueryParams
): HassServiceTarget | undefined =>
  serviceTargetFromQueryParams(params, historyLogbookTargetParamKeys);

export const createHistoryLogbookUrl = (
  path: string,
  target: HassServiceTarget,
  startDate: Date,
  endDate: Date
): string => {
  const queryString = createQueryString(
    {
      ...queryParamsFromServiceTarget(target, historyLogbookTargetParamKeys),
      start_date: startDate,
      end_date: endDate,
    },
    historyLogbookQueryParamConfig
  );

  return queryString ? `${path}?${queryString}` : path;
};
