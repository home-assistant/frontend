import {
  decodeQueryParams,
  hasQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

export const DEFAULT_LOG_PROVIDER = "core";

// `filter` is the search, links from an integration's error count set it.
// `raw` shows the full Home Assistant Core log instead of the errors.
export const logsQueryParamConfig = {
  string: ["provider", "filter"],
  list: ["integration"],
  boolean: [{ key: "raw", trueValue: "1" }],
} as const satisfies QueryParamConfig;

export type LogsQueryParams = QueryParamValues<typeof logsQueryParamConfig>;

export interface LogsState {
  provider: string;
  filter: string;
  // Only apply to the Home Assistant Core log
  integrations: string[];
  raw: boolean;
}

export const DEFAULT_LOGS_STATE: LogsState = {
  provider: DEFAULT_LOG_PROVIDER,
  filter: "",
  integrations: [],
  raw: false,
};

export const logsQueryParams = (state: LogsState): LogsQueryParams => ({
  provider:
    state.provider === DEFAULT_LOG_PROVIDER ? undefined : state.provider,
  filter: state.filter,
  integration:
    state.provider === DEFAULT_LOG_PROVIDER ? state.integrations : undefined,
  raw: state.provider === DEFAULT_LOG_PROVIDER && state.raw,
});

// What a link says to show, undefined when it has none of the page's params
// so what was picked before stays. A link replaces the search and the filter.
export const logsLinkFromUrl = (
  searchParams: SearchParamsSource
): LogsState | undefined => {
  if (!hasQueryParams(searchParams, logsQueryParamConfig)) {
    return undefined;
  }
  const params = decodeQueryParams(searchParams, logsQueryParamConfig);
  const provider = params.provider ?? DEFAULT_LOG_PROVIDER;
  const core = provider === DEFAULT_LOG_PROVIDER;
  return {
    provider,
    filter: params.filter ?? "",
    integrations: core ? (params.integration?.filter(Boolean) ?? []) : [],
    raw: core && !!params.raw,
  };
};
