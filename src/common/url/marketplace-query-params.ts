import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

// The filters of the Marketplace tables. Search, sorting and grouping are kept
// by the data table, see data-table-query-params.
export const marketplaceFilterQueryParamConfig = {
  list: ["status", "type", "source"],
} as const satisfies QueryParamConfig;

export type MarketplaceFilterQueryParams = QueryParamValues<
  typeof marketplaceFilterQueryParamConfig
>;

export const decodeMarketplaceFilterQueryParams = (
  searchParams: SearchParamsSource
): MarketplaceFilterQueryParams =>
  decodeQueryParams(searchParams, marketplaceFilterQueryParamConfig);

export const createMarketplaceFilterQueryString = (
  values: MarketplaceFilterQueryParams
): string => createQueryString(values, marketplaceFilterQueryParamConfig);
