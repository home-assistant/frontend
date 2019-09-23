import { customElement } from "lit-element";
import {
  DeviceCondition,
  fetchDeviceConditions,
  localizeDeviceAutomationCondition,
} from "../../../../data/device_automation";

import "../../../../components/ha-card";

import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-conditions-card")
export class HaDeviceConditionsCard extends HaDeviceAutomationCard<
  DeviceCondition
> {
  protected type = "condition";
  protected headerKey = "ui.panel.config.devices.automation.conditions.caption";

  constructor() {
    super(localizeDeviceAutomationCondition, fetchDeviceConditions);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-conditions-card": HaDeviceConditionsCard;
  }
}
