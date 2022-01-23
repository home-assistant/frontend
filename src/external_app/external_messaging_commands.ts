/*
All commands that do UI stuff need to be loaded from the app bundle.

If loaded it loads components twice causing things to fail.
*/

import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistantMain } from "../layouts/home-assistant-main";
import type { EMExternalMessageCommands } from "./external_messaging";

export const handleExternalMessage = (
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
