import { HassEventBase } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export const EVENT_TAG_SCANNED = "tag_scanned";

export interface TagScannedEvent extends HassEventBase {
  event_type: "tag_scanned";
  data: {
    tag_id: string;
    device_id?: string;
  };
}

export interface Tag {
  id: string;
  name?: string;
  description?: string;
  last_scanned?: string;
}

export interface UpdateTagParams {
  name?: Tag["name"];
  description?: Tag["description"];
}

export const fetchTags = async (hass: HomeAssistant) =>
  hass.callWS<Tag[]>({
    type: "tag/list",
  });

export const createTag = async (
  hass: HomeAssistant,
  params: UpdateTagParams,
  tagId?: string
) =>
  hass.callWS<Tag>({
    type: "tag/create",
    tag_id: tagId,
    ...params,
  });

export const updateTag = async (
  hass: HomeAssistant,
  tagId: string,
  params: UpdateTagParams
) =>
  hass.callWS<Tag>({
    ...params,
    type: "tag/update",
    tag_id: tagId,
  });

export const deleteTag = async (hass: HomeAssistant, tagId: string) =>
  hass.callWS<void>({
    type: "tag/delete",
    tag_id: tagId,
  });
