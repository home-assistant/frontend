/*
All commands that do UI stuff need to be loaded from the app bundle as UI stuff
in core bundle slows things down and causes duplicate registration.

This is the entry point for providing external app stuff from app entrypoint.
*/

import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistantMain } from "../layouts/home-assistant-main";
import type { EMExternalMessageCommands } from "./external_messaging";

export const attachExternalToApp = (hassMainEl: HomeAssistantMain) => {
  window.addEventListener("haptic", (ev) =>
    hassMainEl.hass.auth.external!.fireMessage({
      type: "haptic",
      payload: { hapticType: ev.detail },
    })
  );

  hassMainEl.hass.auth.external!.addCommandHandler((msg) =>
    handleExternalMessage(hassMainEl, msg)
  );
};

const handleExternalMessage = (
  hassMainEl: HomeAssistantMain,
  msg: EMExternalMessageCommands
): boolean => {
  const bus = hassMainEl.hass.auth.external!;

  if (msg.command === "restart") {
    hassMainEl.hass.connection.reconnect(true);
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "notifications/show") {
    fireEvent(hassMainEl, "hass-show-notifications");
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else {
    return false;
  }

  return true;
};
