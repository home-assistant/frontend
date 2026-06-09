import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../array/ensure-array";

export type SearchParamsSource =
  | URLSearchParams
  | Record<string, string>
  | string;

export interface QueryParamConfig<
  ListKey extends string,
  DateKey extends string,
  BooleanKey extends string,
  StringKey extends string = never,
> {
  list?: readonly ListKey[];
  date?: readonly DateKey[];
  boolean?: readonly {
    key: BooleanKey;
    trueValue: string;
  }[];
  string?: readonly StringKey[];
}

export type QueryParamValues<
  ListKey extends string,
  DateKey extends string,
  BooleanKey extends string,
  StringKey extends string = never,
> = Partial<
  Record<ListKey, string[]> &
    Record<DateKey, Date> &
    Record<BooleanKey, boolean> &
    Record<StringKey, string>
>;

export type ServiceTargetQueryParams<
  Key extends keyof HassServiceTarget & string,
> = Partial<Record<Key, string[]>>;

const getSearchParam = (
  searchParams: SearchParamsSource,
  key: string
): string | null => {
  if (typeof searchParams === "string") {
    return new URLSearchParams(searchParams).get(key);
  }
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key);
  }
  return searchParams[key] ?? null;
};

export const decodeQueryParams = <
  ListKey extends string,
  DateKey extends string,
  BooleanKey extends string,
  StringKey extends string = never,
>(
  searchParams: SearchParamsSource,
  config: QueryParamConfig<ListKey, DateKey, BooleanKey, StringKey>
): QueryParamValues<ListKey, DateKey, BooleanKey, StringKey> => {
  const params: QueryParamValues<ListKey, DateKey, BooleanKey, StringKey> = {};
  for (const key of config.list ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = value.split(",") as (typeof params)[typeof key];
    }
  }
  for (const key of config.date ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = new Date(value) as (typeof params)[typeof key];
    }
  }
  for (const { key, trueValue } of config.boolean ?? []) {
    if (getSearchParam(searchParams, key) === trueValue) {
      params[key] = true as (typeof params)[typeof key];
    }
  }
  for (const key of config.string ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = value as (typeof params)[typeof key];
    }
  }
  return params;
};

export const createQueryString = <
  ListKey extends string = never,
  DateKey extends string = never,
  BooleanKey extends string = never,
  StringKey extends string = never,
>(
  values: QueryParamValues<
    NoInfer<ListKey>,
    NoInfer<DateKey>,
    NoInfer<BooleanKey>,
    NoInfer<StringKey>
  >,
  config: QueryParamConfig<ListKey, DateKey, BooleanKey, StringKey>
): string => {
  const searchParams = new URLSearchParams();
  for (const key of config.list ?? []) {
    const value = values[key] as string[] | undefined;
    if (value?.length) {
      searchParams.append(key, value.join(","));
    }
  }
  for (const key of config.date ?? []) {
    const value = values[key] as Date | undefined;
    if (value) {
      searchParams.append(key, value.toISOString());
    }
  }
  for (const { key, trueValue } of config.boolean ?? []) {
    if (values[key]) {
      searchParams.append(key, trueValue);
    }
  }
  for (const key of config.string ?? []) {
    const value = values[key] as string | undefined;
    if (value) {
      searchParams.append(key, value);
    }
  }
  return searchParams.toString();
};

export const serviceTargetFromQueryParams = <
  Key extends keyof HassServiceTarget & string,
>(
  params: ServiceTargetQueryParams<Key>,
  keys: readonly Key[]
): HassServiceTarget | undefined => {
  if (!keys.some((key) => params[key])) {
    return undefined;
  }
  const target: HassServiceTarget = {};
  for (const key of keys) {
    const value = params[key];
    if (value) {
      target[key] = value;
    }
  }
  return target;
};

export const queryParamsFromServiceTarget = <
  Key extends keyof HassServiceTarget & string,
>(
  target: HassServiceTarget,
  keys: readonly Key[]
): ServiceTargetQueryParams<Key> => {
  const params: ServiceTargetQueryParams<Key> = {};
  for (const key of keys) {
    const value = target[key];
    if (value) {
      params[key] = ensureArray(value);
    }
  }
  return params;
};
