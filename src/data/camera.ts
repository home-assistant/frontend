import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { timeCacheEntityPromiseFunc } from "../common/util/time-cache-entity-promise-func";
import type { HomeAssistant } from "../types";
import { getSignedPath } from "./auth";

export const CAMERA_ORIENTATIONS = [1, 2, 3, 4, 6, 8];
export const CAMERA_SUPPORT_ON_OFF = 1;
export const CAMERA_SUPPORT_STREAM = 2;

export const STREAM_TYPE_HLS = "hls";
export const STREAM_TYPE_WEB_RTC = "web_rtc";

export type StreamType = typeof STREAM_TYPE_HLS | typeof STREAM_TYPE_WEB_RTC;

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

export type WebRtcOfferEvent =
  | WebRtcId
  | WebRtcAnswer
  | WebRtcCandidate
  | WebRtcError;

export interface WebRtcId {
  type: "session";
  session_id: string;
}

export interface WebRtcAnswer {
  type: "answer";
  answer: string;
}

export interface WebRtcCandidate {
  type: "candidate";
  candidate: RTCIceCandidateInit;
}

export interface WebRtcError {
  type: "error";
  code: string;
  message: string;
}

export interface WebRtcOfferResponse {
  id: string;
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

export const webRtcOffer = (
  hass: HomeAssistant,
  entity_id: string,
  offer: string,
  callback: (event: WebRtcOfferEvent) => void,
  session_id?: string
) =>
  hass.connection.subscribeMessage<WebRtcOfferEvent>(callback, {
    type: "camera/webrtc/offer",
    entity_id,
    offer,
    session_id,
  });

export const addWebRtcCandidate = (
  hass: HomeAssistant,
  entity_id: string,
  session_id: string,
  candidate: RTCIceCandidateInit
) =>
  hass.callWS({
    type: "camera/webrtc/candidate",
    entity_id,
    session_id,
    candidate: candidate,
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

export interface CameraCapabilities {
  frontend_stream_types: StreamType[];
  two_way_audio: boolean;
}

export const fetchCameraCapabilities = async (
  hass: HomeAssistant,
  entity_id: string
) =>
  hass.callWS<CameraCapabilities>({ type: "camera/capabilities", entity_id });

export interface WebRTCClientConfiguration {
  configuration: RTCConfiguration;
  dataChannel?: string;
}

export const fetchWebRtcClientConfiguration = async (
  hass: HomeAssistant,
  entityId: string
) =>
  hass.callWS<WebRTCClientConfiguration>({
    type: "camera/webrtc/get_client_config",
    entity_id: entityId,
  });
