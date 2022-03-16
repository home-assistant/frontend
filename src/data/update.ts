import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";

export const UPDATE_SUPPORT_SPECIFIC_VERSION = 1;
export const UPDATE_SUPPORT_PROGRESS = 2;
export const UPDATE_SUPPORT_BACKUP = 4;

interface UpdateEntityAttributes extends HassEntityAttributeBase {
  current_version: string | null;
  in_progress: boolean | number;
  latest_version: string | null;
  release_summary: string | null;
  release_url: string | null;
  skipped_version: string | null;
  title: string | null;
}

export interface UpdateEntity extends HassEntityBase {
  attributes: UpdateEntityAttributes;
}

export const isUpdating = (entity: HassEntity | UpdateEntity): boolean =>
  !supportsFeature(entity, UPDATE_SUPPORT_PROGRESS)
    ? entity.attributes.in_progress ?? false
    : typeof entity.attributes.in_progress === "number"
    ? true
    : entity.attributes.in_progress ?? false;
