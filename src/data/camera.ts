import { HomeAssistant } from "../types";

export interface CameraThumbnail {
  content_type: string;
  content: string;
}

export const fetchThumbnail = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<CameraThumbnail>({
    type: "camera_thumbnail",
    entity_id: entityId,
  });
