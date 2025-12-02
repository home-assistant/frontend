/*
All commands that do UI stuff need to be loaded from the app bundle as UI stuff
in core bundle slows things down and causes duplicate registration.

This is the entry point for providing external app stuff from app entrypoint.
*/

import { fireEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { navigate } from "../common/navigate";
import { showAutomationEditor } from "../data/automation";
import type { HomeAssistantMain } from "../layouts/home-assistant-main";
import type {
  EMIncomingMessageBarCodeScanAborted,
  EMIncomingMessageBarCodeScanResult,
  EMIncomingMessageCommands,
  ImprovDiscoveredDevice,
} from "./external_messaging";

const barCodeListeners = new Set<
  (
    msg:
      | EMIncomingMessageBarCodeScanResult
      | EMIncomingMessageBarCodeScanAborted
  ) => boolean
>();

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

export const addExternalBarCodeListener = (
  listener: (
    msg:
      | EMIncomingMessageBarCodeScanResult
      | EMIncomingMessageBarCodeScanAborted
  ) => boolean
) => {
  barCodeListeners.add(listener);
  return () => {
    barCodeListeners.delete(listener);
  };
};

export const handleExternalMessage = (
  hassMainEl: HomeAssistantMain,
  msg: EMIncomingMessageCommands
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
  } else if (msg.command === "navigate") {
    navigate(msg.payload.path, msg.payload.options);
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
  } else if (msg.command === "sidebar/toggle") {
    if (mainWindow.history.state?.open) {
      bus.fireMessage({
        id: msg.id,
        type: "result",
        success: false,
        error: { code: "not_allowed", message: "dialog open" },
      });
      return true;
    }
    fireEvent(hassMainEl, "hass-toggle-menu");
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "sidebar/show") {
    if (mainWindow.history.state?.open) {
      bus.fireMessage({
        id: msg.id,
        type: "result",
        success: false,
        error: { code: "not_allowed", message: "dialog open" },
      });
      return true;
    }
    fireEvent(hassMainEl, "hass-toggle-menu", { open: true });
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "automation/editor/show") {
    showAutomationEditor(msg.payload?.config);
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "improv/discovered_device") {
    fireEvent(window, "improv-discovered-device", msg.payload);
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "improv/device_setup_done") {
    fireEvent(window, "improv-device-setup-done");
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "bar_code/scan_result") {
    barCodeListeners.forEach((listener) => listener(msg));
    bus.fireMessage({
      id: msg.id,
      type: "result",
      success: true,
      result: null,
    });
  } else if (msg.command === "bar_code/aborted") {
    barCodeListeners.forEach((listener) => listener(msg));
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

declare global {
  interface HASSDomEvents {
    "improv-discovered-device": ImprovDiscoveredDevice;
    "improv-device-setup-done": undefined;
  }
}
