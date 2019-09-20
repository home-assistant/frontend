import { customElement } from "lit-element";
import {
  DeviceCondition,
  fetchDeviceConditions,
  localizeDeviceAutomationCondition,
} from "../../../../data/device_automation";

import "../../../../components/ha-card";

import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-triggers-card")
export class HaDeviceConditionsCard extends HaDeviceAutomationCard<
  DeviceCondition
> {
  constructor() {
    super(localizeDeviceAutomationCondition, fetchDeviceConditions);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-conditions-card": HaDeviceConditionsCard;
  }
}
