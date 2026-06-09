import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type QueryParamValues,
  type SearchParamsSource,
} from "./query-params";

export type TodoStringParamKey = "entity_id";

export type TodoBooleanParamKey = "add_item";

export type TodoQueryParams = QueryParamValues<
  never,
  never,
  TodoBooleanParamKey,
  TodoStringParamKey
>;

export const todoQueryParamConfig = {
  string: ["entity_id"],
  boolean: [{ key: "add_item", trueValue: "true" }],
} satisfies QueryParamConfig<
  never,
  never,
  TodoBooleanParamKey,
  TodoStringParamKey
>;

export const decodeTodoQueryParams = (
  searchParams: SearchParamsSource
): TodoQueryParams => decodeQueryParams(searchParams, todoQueryParamConfig);

export const createTodoQueryString = (values: TodoQueryParams): string =>
  createQueryString(values, todoQueryParamConfig);
