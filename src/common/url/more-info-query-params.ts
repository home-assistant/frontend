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
}

export interface CreateMoreInfoUrlData {
  entityId: string;
  view: MoreInfoView;
}

export const decodeMoreInfoUrl = (
  search: SearchParamsSource
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
  };
};

export const createMoreInfoUrl = (
  base: string,
  data: CreateMoreInfoUrlData
): string => {
  const url = new URL(base, window.location.origin);
  url.searchParams.set(ENTITY_ID_PARAM, data.entityId);
  url.searchParams.set(VIEW_PARAM, data.view);

  return `${url.pathname}${url.search}${url.hash}`;
};

export const removeMoreInfoUrl = (base: string): string => {
  const url = new URL(base, window.location.origin);
  url.searchParams.delete(ENTITY_ID_PARAM);
  url.searchParams.delete(VIEW_PARAM);

  return `${url.pathname}${url.search}${url.hash}`;
};
