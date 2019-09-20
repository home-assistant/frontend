import { customElement } from "lit-element";
import {
  DeviceTrigger,
  fetchDeviceTriggers,
  localizeDeviceAutomationTrigger,
} from "../../../../data/device_automation";

import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-triggers-card")
export class HaDeviceTriggersCard extends HaDeviceAutomationCard<
  DeviceTrigger
> {
  protected type = "trigger";
  protected headerKey = "ui.panel.config.devices.automation.triggers.caption";

  constructor() {
    super(localizeDeviceAutomationTrigger, fetchDeviceTriggers);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-triggers-card": HaDeviceTriggersCard;
  }
}
