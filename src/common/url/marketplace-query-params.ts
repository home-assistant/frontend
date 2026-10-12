import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

const marketplaceBrowseQueryParamConfig = {
  list: ["status", "type", "source"],
  string: ["search", "sort", "direction"],
} as const satisfies QueryParamConfig;

export type MarketplaceBrowseQueryParams = QueryParamValues<
  typeof marketplaceBrowseQueryParamConfig
>;

export const decodeMarketplaceBrowseQueryParams = (
  searchParams: SearchParamsSource
): MarketplaceBrowseQueryParams =>
  decodeQueryParams(searchParams, marketplaceBrowseQueryParamConfig);

export const createMarketplaceBrowseQueryString = (
  values: MarketplaceBrowseQueryParams
): string => createQueryString(values, marketplaceBrowseQueryParamConfig);
