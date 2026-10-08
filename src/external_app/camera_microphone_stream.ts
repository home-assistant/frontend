/*
Apps can stream the microphone to a camera themselves, in a separate WebRTC
session next to the video stream of the frontend. Used when the frontend has
no secure context, where browsers block microphone access.
*/

import type { HASSDomEvent } from "../common/dom/fire_event";
import type { ExternalMessaging } from "./external_messaging";

export const canAppStreamMicrophone = (external?: ExternalMessaging) =>
  Boolean(external?.config.hasCameraMicrophoneStream);

/**
 * Asks the app to stream the microphone to the camera.
 * Resolves with the session ID once connected, rejects with `{ code, message }`.
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
  callback: (sessionId: string) => void
): (() => void) => {
  const listener = (ev: HASSDomEvent<HASSDomEvents["webrtc-stream-stopped"]>) =>
    callback(ev.detail.session_id);
  window.addEventListener("webrtc-stream-stopped", listener);
  return () => window.removeEventListener("webrtc-stream-stopped", listener);
};
