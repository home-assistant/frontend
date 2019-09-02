import { customElement } from "lit-element";
import {
  DeviceCondition,
  fetchDeviceConditions,
  localizeDeviceAutomationCondition,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";
import { HaDeviceAutomationPicker } from "./ha-device-automation-picker";

@customElement("ha-device-condition-picker")
class HaDeviceConditionPicker extends HaDeviceAutomationPicker<
  DeviceCondition
> {
  protected NO_AUTOMATION_TEXT = "No conditions";
  protected UNKNOWN_AUTOMATION_TEXT = "Unknown condition";

  protected localizeDeviceAutomation(value) {
    return localizeDeviceAutomationCondition(this.hass, value);
  }

  protected async _fetchDeviceAutomations() {
    const triggers = await fetchDeviceConditions(this.hass!, this.deviceId!);
    return triggers;
  }

  protected get _noAutomation(): DeviceCondition {
    return {
      device_id: this.deviceId || "",
      condition: "device",
      domain: "",
      entity_id: "",
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-condition-picker": HaDeviceConditionPicker;
  }
}
