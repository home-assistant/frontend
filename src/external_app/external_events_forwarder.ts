import { ExternalMessaging } from "./external_messaging";

export const externalForwardConnectionEvents = (bus: ExternalMessaging) => {
  document.addEventListener("connection-status", (ev) =>
    bus.fireMessage({
      type: "connection-status",
      payload: { event: ev.detail },
    })
  );
};

export const externalForwardHaptics = (bus) =>
  document.addEventListener("haptic", (ev) => {
    bus.fireMessage({ type: "haptic", result: { hapticType: ev.detail } });
  });
