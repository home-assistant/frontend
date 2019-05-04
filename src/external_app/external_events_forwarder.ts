import { ExternalMessaging } from "./external_messaging";

export const externalForwardConnectionEvents = (bus: ExternalMessaging) => {
  window.addEventListener("connection-status", (ev) =>
    bus.fireMessage({
      type: "connection-status",
      payload: { event: ev.detail },
    })
  );
};

export const externalForwardHaptics = (bus: ExternalMessaging) =>
  window.addEventListener("haptic", (ev) =>
    bus.fireMessage({ type: "haptic", payload: { hapticType: ev.detail } })
  );
