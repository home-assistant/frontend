import { customElement } from "lit/decorators";
import "../../../../components/ha-card";
import {
  DeviceCondition,
  localizeDeviceAutomationCondition,
} from "../../../../data/device_automation";
import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-conditions-card")
export class HaDeviceConditionsCard extends HaDeviceAutomationCard<DeviceCondition> {
  protected type = "condition";

  protected headerKey = "ui.panel.config.devices.automation.conditions.caption";

  constructor() {
    super(localizeDeviceAutomationCondition);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-conditions-card": HaDeviceConditionsCard;
  }
}
