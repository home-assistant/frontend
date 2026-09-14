import { describe, expect, it, beforeEach, vi } from "vitest";

import { fireEvent } from "../../src/common/dom/fire_event";
import { mainWindow } from "../../src/common/dom/get_main_window";
import { navigate } from "../../src/common/navigate";
import {
  handleExternalMessage,
  addExternalBarCodeListener,
} from "../../src/external_app/external_app_entrypoint";
import { showAutomationEditor } from "../../src/data/automation";
import type {
  EMIncomingMessageRestart,
  EMIncomingMessageNavigate,
  EMIncomingMessageShowNotifications,
  EMIncomingMessageToggleSidebar,
  EMIncomingMessageShowSidebar,
  EMIncomingMessageShowAutomationEditor,
  EMIncomingMessageImprovDeviceDiscovered,
  EMIncomingMessageImprovDeviceSetupDone,
  EMIncomingMessageBarCodeScanResult,
  EMIncomingMessageBarCodeScanAborted,
  EMIncomingMessageKioskModeSet,
} from "../../src/external_app/external_messaging";

vi.mock("../../src/common/dom/fire_event", () => ({
  fireEvent: vi.fn(),
}));
vi.mock("../../src/common/navigate", () => ({
  navigate: vi.fn(),
}));
vi.mock("../../src/data/automation", () => ({
  showAutomationEditor: vi.fn(),
}));

describe("handleExternalMessage", () => {
  let hassMainEl: any;
  let fireMessage: any;
  let reconnect: any;

  beforeEach(() => {
    fireMessage = vi.fn();
    reconnect = vi.fn();
    hassMainEl = {
      hass: {
        auth: {
          external: {
            fireMessage,
          },
        },
        connection: {
          reconnect,
        },
      },
    };
    vi.clearAllMocks();
  });

  it("handles restart command", () => {
    const msg: EMIncomingMessageRestart = {
      type: "command",
      command: "restart",
      id: 1,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(reconnect).toHaveBeenCalledWith(true);
    expect(fireMessage).toHaveBeenCalledWith({
      id: 1,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles navigate command", () => {
    const msg: EMIncomingMessageNavigate = {
      type: "command",
      command: "navigate",
      id: 2,
      payload: { path: "/test", options: { replace: true } },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(navigate).toHaveBeenCalledWith("/test", { replace: true });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 2,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles notifications/show command", () => {
    const msg: EMIncomingMessageShowNotifications = {
      type: "command",
      command: "notifications/show",
      id: 3,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(
      hassMainEl,
      "hass-show-notifications"
    );
    expect(fireMessage).toHaveBeenCalledWith({
      id: 3,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles sidebar/toggle command when dialog is open", () => {
    vi.spyOn(mainWindow.history, "state", "get").mockReturnValue({
      open: true,
    });
    const msg: EMIncomingMessageToggleSidebar = {
      type: "command",
      command: "sidebar/toggle",
      id: 4,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).not.toHaveBeenCalled();
    expect(fireMessage).toHaveBeenCalledWith({
      id: 4,
      type: "result",
      success: false,
      error: { code: "not_allowed", message: "dialog open" },
    });
    expect(result).toBe(true);
  });

  it("handles sidebar/toggle command when dialog is not open", () => {
    vi.spyOn(mainWindow.history, "state", "get").mockReturnValue({
      open: false,
    });
    const msg: EMIncomingMessageToggleSidebar = {
      type: "command",
      command: "sidebar/toggle",
      id: 5,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(hassMainEl, "hass-toggle-menu");
    expect(fireMessage).toHaveBeenCalledWith({
      id: 5,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles sidebar/show command when dialog is open", () => {
    vi.spyOn(mainWindow.history, "state", "get").mockReturnValue({
      open: true,
    });
    const msg: EMIncomingMessageShowSidebar = {
      type: "command",
      command: "sidebar/show",
      id: 6,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).not.toHaveBeenCalled();
    expect(fireMessage).toHaveBeenCalledWith({
      id: 6,
      type: "result",
      success: false,
      error: { code: "not_allowed", message: "dialog open" },
    });
    expect(result).toBe(true);
  });

  it("handles sidebar/show command when dialog is not open", () => {
    vi.spyOn(mainWindow.history, "state", "get").mockReturnValue({
      open: false,
    });
    const msg: EMIncomingMessageShowSidebar = {
      type: "command",
      command: "sidebar/show",
      id: 7,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(hassMainEl, "hass-toggle-menu", {
      open: true,
    });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 7,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles automation/editor/show command", () => {
    const msg: EMIncomingMessageShowAutomationEditor = {
      type: "command",
      command: "automation/editor/show",
      id: 8,
      payload: { config: { id: "42" } },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(showAutomationEditor).toHaveBeenCalledWith({ id: "42" });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 8,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles improv/discovered_device command", () => {
    const msg: EMIncomingMessageImprovDeviceDiscovered = {
      type: "command",
      command: "improv/discovered_device",
      id: 9,
      payload: { name: "helloworld" },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(window, "improv-discovered-device", {
      name: "helloworld",
    });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 9,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles improv/device_setup_done command", () => {
    const msg: EMIncomingMessageImprovDeviceSetupDone = {
      type: "command",
      command: "improv/device_setup_done",
      id: 10,
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(window, "improv-device-setup-done");
    expect(fireMessage).toHaveBeenCalledWith({
      id: 10,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles bar_code/scan_result command and notifies listeners", () => {
    const listener = vi.fn();
    addExternalBarCodeListener(listener);
    const msg: EMIncomingMessageBarCodeScanResult = {
      type: "command",
      command: "bar_code/scan_result",
      id: 11,
      payload: { rawValue: "123456789", format: "aztec" },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(listener).toHaveBeenCalledWith(msg);
    expect(fireMessage).toHaveBeenCalledWith({
      id: 11,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles bar_code/aborted command and notifies listeners", () => {
    const listener = vi.fn();
    addExternalBarCodeListener(listener);
    const msg: EMIncomingMessageBarCodeScanAborted = {
      type: "command",
      command: "bar_code/aborted",
      id: 12,
      payload: { reason: "canceled" },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(listener).toHaveBeenCalledWith(msg);
    expect(fireMessage).toHaveBeenCalledWith({
      id: 12,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles kiosk_mode/set command with excluded_elements", () => {
    const msg: EMIncomingMessageKioskModeSet = {
      type: "command",
      command: "kiosk_mode/set",
      id: 13,
      payload: { enable: true, excluded_elements: ["sidebar_button"] },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(window, "hass-kiosk-mode", {
      enable: true,
      excludedElements: ["sidebar_button"],
      includedElements: undefined,
    });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 13,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("handles kiosk_mode/set command with included_elements", () => {
    const msg: EMIncomingMessageKioskModeSet = {
      type: "command",
      command: "kiosk_mode/set",
      id: 14,
      payload: { enable: true, included_elements: ["dashboard_tabs"] },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).toHaveBeenCalledWith(window, "hass-kiosk-mode", {
      enable: true,
      excludedElements: undefined,
      includedElements: ["dashboard_tabs"],
    });
    expect(fireMessage).toHaveBeenCalledWith({
      id: 14,
      type: "result",
      success: true,
      result: null,
    });
    expect(result).toBe(true);
  });

  it("rejects kiosk_mode/set command with both element lists", () => {
    const msg: EMIncomingMessageKioskModeSet = {
      type: "command",
      command: "kiosk_mode/set",
      id: 15,
      payload: {
        enable: true,
        excluded_elements: ["sidebar"],
        included_elements: ["dashboard_tabs"],
      },
    };
    const result = handleExternalMessage(hassMainEl, msg);
    expect(fireEvent).not.toHaveBeenCalled();
    expect(fireMessage).toHaveBeenCalledTimes(1);
    expect(fireMessage).toHaveBeenCalledWith({
      id: 15,
      type: "result",
      success: false,
      error: {
        code: "invalid_format",
        message: "Pass either excluded_elements or included_elements, not both",
      },
    });
    expect(result).toBe(true);
  });
});
