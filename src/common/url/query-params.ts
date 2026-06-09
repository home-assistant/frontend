import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../array/ensure-array";

export type SearchParamsSource =
  | URLSearchParams
  | Record<string, string>
  | string;

export interface QueryParamConfig {
  list?: readonly string[];
  date?: readonly string[];
  boolean?: readonly {
    key: string;
    trueValue: string;
  }[];
  string?: readonly string[];
}

type ListKeyOf<C extends QueryParamConfig> = C extends {
  list: readonly (infer K extends string)[];
}
  ? K
  : never;

type DateKeyOf<C extends QueryParamConfig> = C extends {
  date: readonly (infer K extends string)[];
}
  ? K
  : never;

type BooleanKeyOf<C extends QueryParamConfig> = C extends {
  boolean: readonly { key: infer K extends string }[];
}
  ? K
  : never;

type StringKeyOf<C extends QueryParamConfig> = C extends {
  string: readonly (infer K extends string)[];
}
  ? K
  : never;

export type QueryParamValues<C extends QueryParamConfig> = Partial<
  Record<ListKeyOf<C>, string[]> &
    Record<DateKeyOf<C>, Date> &
    Record<BooleanKeyOf<C>, boolean> &
    Record<StringKeyOf<C>, string>
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

export const decodeQueryParams = <C extends QueryParamConfig>(
  searchParams: SearchParamsSource,
  config: C
): QueryParamValues<C> => {
  const params: Record<string, unknown> = {};
  for (const key of config.list ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = value.split(",");
    }
  }
  for (const key of config.date ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = new Date(value);
    }
  }
  for (const { key, trueValue } of config.boolean ?? []) {
    if (getSearchParam(searchParams, key) === trueValue) {
      params[key] = true;
    }
  }
  for (const key of config.string ?? []) {
    const value = getSearchParam(searchParams, key);
    if (value) {
      params[key] = value;
    }
  }
  return params as QueryParamValues<C>;
};

export const createQueryString = <C extends QueryParamConfig>(
  values: QueryParamValues<NoInfer<C>>,
  config: C
): string => {
  const searchParams = new URLSearchParams();
  const record = values as Record<string, unknown>;
  for (const key of config.list ?? []) {
    const value = record[key] as string[] | undefined;
    if (value?.length) {
      searchParams.append(key, value.join(","));
    }
  }
  for (const key of config.date ?? []) {
    const value = record[key] as Date | undefined;
    if (value) {
      searchParams.append(key, value.toISOString());
    }
  }
  for (const { key, trueValue } of config.boolean ?? []) {
    if (record[key]) {
      searchParams.append(key, trueValue);
    }
  }
  for (const key of config.string ?? []) {
    const value = record[key] as string | undefined;
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
