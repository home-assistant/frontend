import {
  decodeQueryParams,
  hasQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

// `status` adds the ignored and disabled integrations to what is shown.
export const integrationsQueryParamConfig = {
  string: ["search"],
  list: ["status"],
} as const satisfies QueryParamConfig;

export const integrationQueryParamConfig = {
  string: ["search"],
} as const satisfies QueryParamConfig;

export type IntegrationsQueryParams = QueryParamValues<
  typeof integrationsQueryParamConfig
>;

export interface IntegrationsState {
  search: string;
  showIgnored: boolean;
  showDisabled: boolean;
}

export const integrationsQueryParams = (
  state: IntegrationsState
): IntegrationsQueryParams => ({
  search: state.search,
  status: [
    ...(state.showIgnored ? ["ignored"] : []),
    ...(state.showDisabled ? ["disabled"] : []),
  ],
});

// What a link says to show, undefined when it has none of the page's params
// so what was picked before stays. A link replaces the search and the toggles.
export const integrationsLinkFromUrl = (
  searchParams: SearchParamsSource
): IntegrationsState | undefined => {
  if (!hasQueryParams(searchParams, integrationsQueryParamConfig)) {
    return undefined;
  }

  const { search, status } = decodeQueryParams(
    searchParams,
    integrationsQueryParamConfig
  );

  return {
    search: search ?? "",
    showIgnored: !!status?.includes("ignored"),
    showDisabled: !!status?.includes("disabled"),
  };
};

export const integrationSearchFromUrl = (
  searchParams: SearchParamsSource
): string | undefined => {
  if (!hasQueryParams(searchParams, integrationQueryParamConfig)) {
    return undefined;
  }

  return (
    decodeQueryParams(searchParams, integrationQueryParamConfig).search ?? ""
  );
};
