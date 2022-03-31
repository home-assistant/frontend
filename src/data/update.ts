import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { BINARY_STATE_ON } from "../common/const";
import { supportsFeature } from "../common/entity/supports-feature";
import { HomeAssistant } from "../types";

export const UPDATE_SUPPORT_INSTALL = 1;
export const UPDATE_SUPPORT_SPECIFIC_VERSION = 2;
export const UPDATE_SUPPORT_PROGRESS = 4;
export const UPDATE_SUPPORT_BACKUP = 8;
export const UPDATE_SUPPORT_RELEASE_NOTES = 16;
export const UPDATE_SUPPORT_AUTO_UPDATE = 32;

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
  entity.state === BINARY_STATE_ON &&
  supportsFeature(entity, UPDATE_SUPPORT_INSTALL);

export const updateIsInstalling = (entity: UpdateEntity): boolean =>
  updateUsesProgress(entity) || !!entity.attributes.in_progress;

export const updateReleaseNotes = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<string | null>({
    type: "update/release_notes",
    entity_id: entityId,
  });
