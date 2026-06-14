import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

export const todoQueryParamConfig = {
  string: ["entity_id"],
  boolean: [{ key: "add_item", trueValue: "true" }],
} as const satisfies QueryParamConfig;

export type TodoQueryParams = QueryParamValues<typeof todoQueryParamConfig>;

export const decodeTodoQueryParams = (
  searchParams: SearchParamsSource
): TodoQueryParams => decodeQueryParams(searchParams, todoQueryParamConfig);

export const createTodoQueryString = (values: TodoQueryParams): string =>
  createQueryString(values, todoQueryParamConfig);
