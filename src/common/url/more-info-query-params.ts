import {
  isMoreInfoView,
  type MoreInfoView,
} from "../../dialogs/more-info/more-info-view";
import type { SearchParamsSource } from "./query-params";

const ENTITY_ID_PARAM = "more-info-entity-id";
const VIEW_PARAM = "more-info-view";

/**
 * Route that shows the more-info dialog as a frameless page, without the
 * sidebar or a panel around it. Meant for external apps that embed it in a
 * native screen. The entity and view are read from the same query parameters
 * as the more-info deep link on any other route.
 */
export const MORE_INFO_STANDALONE_PATH = "/more-info";

export const isMoreInfoStandalonePath = (path: string): boolean =>
  path.replace(/\/+$/, "") === MORE_INFO_STANDALONE_PATH;

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

/** The standalone route for an entity, opening on its default view. */
export const createStandaloneMoreInfoUrl = (entityId: string): string => {
  const params = new URLSearchParams({ [ENTITY_ID_PARAM]: entityId });
  return `${MORE_INFO_STANDALONE_PATH}?${params}`;
};

export const removeMoreInfoUrl = (base: string): string => {
  const url = new URL(base, window.location.origin);
  url.searchParams.delete(ENTITY_ID_PARAM);
  url.searchParams.delete(VIEW_PARAM);

  return `${url.pathname}${url.search}${url.hash}`;
};
