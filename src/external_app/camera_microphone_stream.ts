/*
Apps can stream the microphone to a camera themselves, in a separate WebRTC
session next to the video stream of the frontend. Used when the frontend has
no secure context, where browsers block microphone access.
*/

import type { HASSDomEvent } from "../common/dom/fire_event";
import type {
  ExternalMessaging,
  WebRtcStreamErrorCode,
  WebRtcStreamStopped,
} from "./external_messaging";
import { WEBRTC_STREAM_ERROR_CODES } from "./external_messaging";

export const canAppStreamMicrophone = (external?: ExternalMessaging) =>
  Boolean(external?.config.webrtc?.hasCameraMicrophoneStream);

export const isWebRtcStreamErrorCode = (
  code: string
): code is WebRtcStreamErrorCode =>
  (WEBRTC_STREAM_ERROR_CODES as readonly string[]).includes(code);

/**
 * Asks the app to stream the microphone to the camera.
 * Resolves with the session ID once connected, rejects with `{ code, message }`
 * where `code` is a `WebRtcStreamErrorCode`.
 */
export const startAppMicrophoneStream = async (
  external: ExternalMessaging,
  entityId: string
): Promise<string> => {
  const { session_id } = await external.sendMessage<"webrtc/stream/start">({
    type: "webrtc/stream/start",
    payload: {
      stream_type: "microphone",
      entity_id: entityId,
    },
  });
  return session_id;
};

export const stopAppMicrophoneStream = (
  external: ExternalMessaging,
  sessionId: string
) =>
  external.fireMessage({
    type: "webrtc/stream/stop",
    payload: { session_id: sessionId },
  });

/**
 * Calls `callback` when the app ends a session without the frontend stopping it.
 * Returns a function to unsubscribe.
 */
export const subscribeAppStreamStopped = (
  callback: (stopped: WebRtcStreamStopped) => void
): (() => void) => {
  const listener = (ev: HASSDomEvent<HASSDomEvents["webrtc-stream-stopped"]>) =>
    callback(ev.detail);
  window.addEventListener("webrtc-stream-stopped", listener);
  return () => window.removeEventListener("webrtc-stream-stopped", listener);
};
