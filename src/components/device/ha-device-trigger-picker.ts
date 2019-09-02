import { customElement } from "lit-element";
import {
  DeviceTrigger,
  fetchDeviceTriggers,
  localizeDeviceAutomationTrigger,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";
import { HaDeviceAutomationPicker } from "./ha-device-automation-picker";

@customElement("ha-device-trigger-picker")
class HaDeviceTriggerPicker extends HaDeviceAutomationPicker<DeviceTrigger> {
  protected NO_AUTOMATION_TEXT = "No triggers";
  protected UNKNOWN_AUTOMATION_TEXT = "Unknown trigger";

  protected localizeDeviceAutomation(value) {
    return localizeDeviceAutomationTrigger(this.hass, value);
  }

  protected async _fetchDeviceAutomations() {
    const triggers = await fetchDeviceTriggers(this.hass!, this.deviceId!);
    return triggers;
  }

  protected get _noAutomation(): DeviceTrigger {
    return {
      device_id: this.deviceId || "",
      platform: "device",
      domain: "",
      entity_id: "",
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-trigger-picker": HaDeviceTriggerPicker;
  }
}
