import { customElement } from "lit-element";
import {
  DeviceAction,
  fetchDeviceActions,
  localizeDeviceAutomationAction,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";
import { HaDeviceAutomationPicker } from "./ha-device-automation-picker";

@customElement("ha-device-action-picker")
class HaDeviceActionPicker extends HaDeviceAutomationPicker<DeviceAction> {
  protected NO_AUTOMATION_TEXT = "No actions";
  protected UNKNOWN_AUTOMATION_TEXT = "Unknown action";

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
