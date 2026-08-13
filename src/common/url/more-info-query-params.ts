import type { MoreInfoView } from "../../dialogs/more-info/const";
import { isMoreInfoView } from "../../dialogs/more-info/const";
import {
  createQueryString,
  decodeQueryParams,
  type QueryParamConfig,
  type SearchParamsSource,
} from "./query-params";

export const moreInfoQueryParamConfig = {
  string: ["more-info-entity-id", "more-info-view"],
} as const satisfies QueryParamConfig;

export interface MoreInfoUrlData {
  entityId?: string;
  view?: MoreInfoView;
  hash: URLSearchParams;
}

export interface CreateMoreInfoUrlData {
  entityId: string;
  view: MoreInfoView;
  hash?: URLSearchParams;
}

export const decodeMoreInfoUrl = (
  search: SearchParamsSource,
  hash = ""
): MoreInfoUrlData => {
  const params = decodeQueryParams(search, moreInfoQueryParamConfig);

  return {
    entityId: params["more-info-entity-id"],
    view: isMoreInfoView(params["more-info-view"])
      ? params["more-info-view"]
      : undefined,
    hash: new URLSearchParams(
      __DEMO__ ? "" : hash.startsWith("#") ? hash.substring(1) : hash
    ),
  };
};

export const createMoreInfoUrl = (
  base: string,
  data: CreateMoreInfoUrlData
): string => {
  const url = new URL(base, window.location.origin);
  const moreInfoQuery = new URLSearchParams(
    createQueryString(
      {
        "more-info-entity-id": data.entityId,
        "more-info-view": data.view,
      },
      moreInfoQueryParamConfig
    )
  );

  for (const [key, value] of moreInfoQuery) {
    url.searchParams.set(key, value);
  }
  if (!__DEMO__) {
    url.hash = data.hash?.toString() ?? "";
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const removeMoreInfoUrl = (base: string): string => {
  const url = new URL(base, window.location.origin);
  for (const key of moreInfoQueryParamConfig.string) {
    url.searchParams.delete(key);
  }
  if (!__DEMO__) {
    url.hash = "";
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
