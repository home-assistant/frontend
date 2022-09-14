import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { timeCacheEntityPromiseFunc } from "../common/util/time-cache-entity-promise-func";
import { HomeAssistant } from "../types";
import { getSignedPath } from "./auth";

export const CAMERA_ORIENTATIONS = [1, 2, 3, 4, 6, 8];
export const CAMERA_SUPPORT_ON_OFF = 1;
export const CAMERA_SUPPORT_STREAM = 2;

export const STREAM_TYPE_HLS = "hls";
export const STREAM_TYPE_WEB_RTC = "web_rtc";

interface CameraEntityAttributes extends HassEntityAttributeBase {
  model_name: string;
  access_token: string;
  brand: string;
  motion_detection: boolean;
  frontend_stream_type: string;
}

export interface CameraEntity extends HassEntityBase {
  attributes: CameraEntityAttributes;
}

export interface CameraPreferences {
  preload_stream: boolean;
  orientation: number;
}

export interface CameraThumbnail {
  content_type: string;
  content: string;
}

export interface Stream {
  url: string;
}

export interface WebRtcAnswer {
  answer: string;
}

export const cameraUrlWithWidthHeight = (
  base_url: string,
  width: number,
  height: number
) => `${base_url}&width=${width}&height=${height}`;

export const computeMJPEGStreamUrl = (entity: CameraEntity) =>
  `/api/camera_proxy_stream/${entity.entity_id}?token=${entity.attributes.access_token}`;

export const fetchThumbnailUrlWithCache = async (
  hass: HomeAssistant,
  entityId: string,
  width: number,
  height: number
) => {
  const base_url = await timeCacheEntityPromiseFunc(
    "_cameraTmbUrl",
    9000,
    fetchThumbnailUrl,
    hass,
    entityId
  );
  return cameraUrlWithWidthHeight(base_url, width, height);
};

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

export const handleWebRtcOffer = (
  hass: HomeAssistant,
  entityId: string,
  offer: string
) =>
  hass.callWS<WebRtcAnswer>({
    type: "camera/web_rtc_offer",
    entity_id: entityId,
    offer: offer,
  });

export const fetchCameraPrefs = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<CameraPreferences>({
    type: "camera/get_prefs",
    entity_id: entityId,
  });

type ValueOf<T extends any[]> = T[number];
export const updateCameraPrefs = (
  hass: HomeAssistant,
  entityId: string,
  prefs: {
    preload_stream?: boolean;
    orientation?: ValueOf<typeof CAMERA_ORIENTATIONS>;
  }
) =>
  hass.callWS<CameraPreferences>({
    type: "camera/update_prefs",
    entity_id: entityId,
    ...prefs,
  });

const CAMERA_MEDIA_SOURCE_PREFIX = "media-source://camera/";

export const isCameraMediaSource = (mediaContentId: string) =>
  mediaContentId.startsWith(CAMERA_MEDIA_SOURCE_PREFIX);

export const getEntityIdFromCameraMediaSource = (mediaContentId: string) =>
  mediaContentId.substring(CAMERA_MEDIA_SOURCE_PREFIX.length);
