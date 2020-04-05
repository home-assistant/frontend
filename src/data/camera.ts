import { HomeAssistant, CameraEntity } from "../types";
import { timeCachePromiseFunc } from "../common/util/time-cache-function-promise";
import { getSignedPath } from "./auth";

export const CAMERA_SUPPORT_ON_OFF = 1;
export const CAMERA_SUPPORT_STREAM = 2;
export const DEFAULT_THUMBNAIL_CACHE = 9000;

export interface CameraPreferences {
  preload_stream: boolean;
}

export interface CameraThumbnail {
  content_type: string;
  content: string;
}

export interface Stream {
  url: string;
}

export const computeMJPEGStreamUrl = (entity: CameraEntity) =>
  `/api/camera_proxy_stream/${entity.entity_id}?token=${entity.attributes.access_token}`;

export const fetchThumbnailUrlWithCache = (
  hass: HomeAssistant,
  entityId: string,
  cacheTime: number = DEFAULT_THUMBNAIL_CACHE
) =>
  timeCachePromiseFunc(
    "_cameraTmbUrl",
    cacheTime >= 0 ? cacheTime : DEFAULT_THUMBNAIL_CACHE,
    fetchThumbnailUrl,
    hass,
    entityId
  );

export const fetchThumbnailUrl = async (
  hass: HomeAssistant,
  entityId: string
) => {
  const path = await getSignedPath(hass, `/api/camera_proxy/${entityId}`);
  return hass.hassUrl(path.path);
};

export const fetchStreamUrl = async (
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
  const stream = await hass.callWS<Stream>(data);
  stream.url = hass.hassUrl(stream.url);
  return stream;
};

export const fetchCameraPrefs = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<CameraPreferences>({
    type: "camera/get_prefs",
    entity_id: entityId,
  });

export const updateCameraPrefs = (
  hass: HomeAssistant,
  entityId: string,
  prefs: {
    preload_stream?: boolean;
  }
) =>
  hass.callWS<CameraPreferences>({
    type: "camera/update_prefs",
    entity_id: entityId,
    ...prefs,
  });
