import { customElement } from "lit/decorators";
import {
  DeviceAction,
  fetchDeviceActions,
  localizeDeviceAutomationAction,
} from "../../data/device_automation";
import { HaDeviceAutomationPicker } from "./ha-device-automation-picker";

@customElement("ha-device-action-picker")
class HaDeviceActionPicker extends HaDeviceAutomationPicker<DeviceAction> {
  protected get NO_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.actions.no_actions"
    );
  }

  protected get UNKNOWN_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.actions.unknown_action"
    );
  }

  constructor() {
    super(
      localizeDeviceAutomationAction,
      fetchDeviceActions,
      (deviceId?: string) => ({
        device_id: deviceId || "",
        domain: "",
        entity_id: "",
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-action-picker": HaDeviceActionPicker;
  }
}
