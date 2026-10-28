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

// The filters as the URL holds them with each list sorted, so the same filters
// in another order compare equal. A filter list sends back what it was given
// in its own order.
export const sortedMarketplaceFilterQueryString = (
  values: MarketplaceFilterQueryParams
): string => {
  const sorted: MarketplaceFilterQueryParams = {};

  for (const key of marketplaceFilterQueryParamConfig.list) {
    sorted[key] = values[key] && [...values[key]].sort();
  }

  return createMarketplaceFilterQueryString(sorted);
};
