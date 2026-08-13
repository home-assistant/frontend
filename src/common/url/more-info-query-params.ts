import {
  isMoreInfoView,
  type MoreInfoView,
} from "../../dialogs/more-info/more-info-view";
import type { SearchParamsSource } from "./query-params";

const ENTITY_ID_PARAM = "more-info-entity-id";
const VIEW_PARAM = "more-info-view";

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
  const params =
    typeof search === "string"
      ? new URLSearchParams(search)
      : search instanceof URLSearchParams
        ? search
        : new URLSearchParams(search);
  const entityId = params.get(ENTITY_ID_PARAM) || undefined;
  const view = params.get(VIEW_PARAM) || undefined;

  return {
    entityId,
    view: isMoreInfoView(view) ? view : undefined,
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
  url.searchParams.set(ENTITY_ID_PARAM, data.entityId);
  url.searchParams.set(VIEW_PARAM, data.view);
  if (!__DEMO__) {
    url.hash = data.hash?.toString() ?? "";
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const removeMoreInfoUrl = (base: string): string => {
  const url = new URL(base, window.location.origin);
  url.searchParams.delete(ENTITY_ID_PARAM);
  url.searchParams.delete(VIEW_PARAM);
  if (!__DEMO__) {
    url.hash = "";
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
