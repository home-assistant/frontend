import { addRecent } from "../common/array/add-recent";
import { getStorage } from "../common/decorators/storage";

export const STREAM_TYPE_HLS = "hls";
export const STREAM_TYPE_WEB_RTC = "web_rtc";

export type StreamType = typeof STREAM_TYPE_HLS | typeof STREAM_TYPE_WEB_RTC;

export const MJPEG_STREAM = "mjpeg";

export type CameraStreamType = StreamType | typeof MJPEG_STREAM;

export interface CameraStream {
  type: CameraStreamType;
  visible: boolean;
}

/** What a player reported, `hasVideo: false` means it failed to load. */
export interface CameraStreamTracks {
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface CameraStreamSelectionOptions {
  supportedTypes?: StreamType[];
  hlsStreams?: CameraStreamTracks;
  webRtcStreams?: CameraStreamTracks;
  /** Only start WebRTC and keep HLS off until WebRTC fails or takes too long. */
  webRtcFirst?: boolean;
}

/**
 * Decides which players are rendered and which one is shown. Hidden players
 * are still loading in the background.
 */
export const selectCameraStreams = ({
  supportedTypes,
  hlsStreams,
  webRtcStreams,
  webRtcFirst,
}: CameraStreamSelectionOptions): CameraStream[] => {
  if (!supportedTypes) {
    return [];
  }
  if (supportedTypes.length === 0) {
    // doesn't support any stream type, fallback to mjpeg
    return [{ type: MJPEG_STREAM, visible: true }];
  }
  if (supportedTypes.length === 1) {
    // only 1 stream type, no need to choose
    if (
      (supportedTypes[0] === STREAM_TYPE_HLS &&
        hlsStreams?.hasVideo === false) ||
      (supportedTypes[0] === STREAM_TYPE_WEB_RTC &&
        webRtcStreams?.hasVideo === false)
    ) {
      // stream failed to load, fallback to mjpeg
      return [{ type: MJPEG_STREAM, visible: true }];
    }
    return [{ type: supportedTypes[0], visible: true }];
  }

  const hlsFailed = hlsStreams?.hasVideo === false;

  if (webRtcStreams?.hasVideo) {
    // WebRTC is preferred whenever it plays, it has the lowest latency
    return [{ type: STREAM_TYPE_WEB_RTC, visible: true }];
  }

  if (webRtcStreams?.hasVideo === false) {
    if (hlsFailed) {
      // both streams failed to load, fallback to mjpeg
      return [{ type: MJPEG_STREAM, visible: true }];
    }
    return [{ type: STREAM_TYPE_HLS, visible: true }];
  }

  // WebRTC is still loading
  if (hlsFailed || (webRtcFirst && !hlsStreams)) {
    return [{ type: STREAM_TYPE_WEB_RTC, visible: true }];
  }
  return [
    { type: STREAM_TYPE_HLS, visible: true },
    { type: STREAM_TYPE_WEB_RTC, visible: false },
  ];
};

const WEB_RTC_ENTITIES_KEY = "cameraWebRtcEntities";

const MAX_WEB_RTC_ENTITIES = 100;

const getWebRtcEntities = (): string[] => {
  const entities = getStorage().getValue<string[]>(WEB_RTC_ENTITIES_KEY);
  return Array.isArray(entities) ? entities : [];
};

/**
 * If WebRTC was the stream that ended up playing for this camera in this
 * browser. Stored per browser, as it depends on the network of the client.
 */
export const hasWebRtcWorked = (entityId: string): boolean =>
  getWebRtcEntities().includes(entityId);

export const setWebRtcWorked = (entityId: string, worked: boolean): void => {
  const entities = getWebRtcEntities();
  if (entities.includes(entityId) === worked) {
    return;
  }
  getStorage().setValue(
    WEB_RTC_ENTITIES_KEY,
    worked
      ? addRecent(entities, entityId, MAX_WEB_RTC_ENTITIES)
      : entities.filter((entity) => entity !== entityId)
  );
};
