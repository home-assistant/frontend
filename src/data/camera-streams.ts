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
}

/**
 * Decides which players are rendered and which one is shown. Hidden players
 * are still loading in the background.
 */
export const selectCameraStreams = ({
  supportedTypes,
  hlsStreams,
  webRtcStreams,
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
  if (hlsFailed) {
    return [{ type: STREAM_TYPE_WEB_RTC, visible: true }];
  }
  return [
    { type: STREAM_TYPE_HLS, visible: true },
    { type: STREAM_TYPE_WEB_RTC, visible: false },
  ];
};

/** What the player tells the user about the connection of its stream. */
export interface CameraStreamStatus {
  /** The stream that is shown, undefined until the camera's types are known */
  type?: CameraStreamType;
  /** The shown stream has not played its first frame yet */
  connecting: boolean;
  /** A faster stream that connects in the background to replace the shown one */
  upgrading?: CameraStreamType;
  /** The shown stream has sound */
  hasAudio: boolean;
}

export const computeCameraStreamStatus = (
  streams: CameraStream[],
  loaded: ReadonlySet<CameraStreamType>,
  hlsStreams?: CameraStreamTracks,
  webRtcStreams?: CameraStreamTracks
): CameraStreamStatus => {
  const visible = streams.find((stream) => stream.visible);
  if (!visible) {
    return { connecting: true, hasAudio: false };
  }
  const hidden = streams.find((stream) => !stream.visible);
  const tracks =
    visible.type === STREAM_TYPE_HLS
      ? hlsStreams
      : visible.type === STREAM_TYPE_WEB_RTC
        ? webRtcStreams
        : undefined;
  const connecting = !loaded.has(visible.type);
  return {
    type: visible.type,
    connecting,
    // Only worth mentioning once the shown stream plays, before that the
    // whole player is connecting
    upgrading: hidden && !connecting ? hidden.type : undefined,
    hasAudio: !connecting && (tracks?.hasAudio ?? false),
  };
};
