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

  constructor() {
    super(
      localizeDeviceAutomationTrigger,
      fetchDeviceTriggers,
      (deviceId?: string) => ({
        device_id: deviceId || "",
        platform: "device",
        domain: "",
        entity_id: "",
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-trigger-picker": HaDeviceTriggerPicker;
  }
}
