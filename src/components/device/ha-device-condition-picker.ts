import { customElement } from "lit/decorators";
import {
  DeviceCondition,
  fetchDeviceConditions,
  localizeDeviceAutomationCondition,
} from "../../data/device_automation";
import { HaDeviceAutomationPicker } from "./ha-device-automation-picker";

@customElement("ha-device-condition-picker")
class HaDeviceConditionPicker extends HaDeviceAutomationPicker<DeviceCondition> {
  protected get NO_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.conditions.no_conditions"
    );
  }

  protected get UNKNOWN_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.conditions.unknown_condition"
    );
  }

  constructor() {
    super(
      localizeDeviceAutomationCondition,
      fetchDeviceConditions,
      (deviceId?: string) => ({
        device_id: deviceId || "",
        condition: "device",
        domain: "",
        entity_id: "",
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-condition-picker": HaDeviceConditionPicker;
  }
}
