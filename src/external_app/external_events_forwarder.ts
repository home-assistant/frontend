import { ExternalMessaging } from "./external_messaging";

export const externalForwardConnectionEvents = (bus: ExternalMessaging) => {
  document.addEventListener("connection-status", (ev) =>
    bus.fireMessage({
      type: "connection-status",
      payload: { event: ev.detail },
    })
  );
};
