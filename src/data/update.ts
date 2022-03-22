import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";

export const UPDATE_SUPPORT_INSTALL = 1;
export const UPDATE_SUPPORT_SPECIFIC_VERSION = 2;
export const UPDATE_SUPPORT_PROGRESS = 4;
export const UPDATE_SUPPORT_BACKUP = 8;

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

export const updateUsesProgress = (entity: UpdateEntity): boolean =>
  supportsFeature(entity, UPDATE_SUPPORT_PROGRESS) &&
  typeof entity.attributes.in_progress === "number";

export const updateCanInstall = (entity: UpdateEntity): boolean =>
  supportsFeature(entity, UPDATE_SUPPORT_INSTALL) &&
  entity.attributes.latest_version !== entity.attributes.current_version &&
  entity.attributes.latest_version !== entity.attributes.skipped_version;

export const updateIsInstalling = (entity: UpdateEntity): boolean =>
  updateUsesProgress(entity) || !!entity.attributes.in_progress;
