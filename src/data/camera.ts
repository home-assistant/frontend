import { HomeAssistant, CameraEntity } from "../types";
import { timeCachePromiseFunc } from "../common/util/time-cache-function-promise";

export interface CameraThumbnail {
  content_type: string;
  content: string;
}

export interface Stream {
  url: string;
}

export const computeMJPEGStreamUrl = (entity: CameraEntity) =>
  `/api/camera_proxy_stream/${entity.entity_id}?token=${
    entity.attributes.access_token
  }`;

export const fetchThumbnailWithCache = (
  hass: HomeAssistant,
  entityId: string
) => timeCachePromiseFunc("_cameraTmb", 9000, fetchThumbnail, hass, entityId);

export const fetchThumbnail = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<CameraThumbnail>({
    type: "camera_thumbnail",
    entity_id: entityId,
  });

export const fetchStreamUrl = (
  hass: HomeAssistant,
  entityId: string,
  format?: "hls"
) => {
  const data = {
    type: "camera/stream",
    entity_id: entityId,
  };
  if (format) {
    // @ts-ignore
    data.format = format;
  }
  return hass.callWS<Stream>(data);
};
