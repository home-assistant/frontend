import { customElement } from "lit/decorators";
import {
  DeviceTrigger,
  localizeDeviceAutomationTrigger,
} from "../../../../data/device_automation";
import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-triggers-card")
export class HaDeviceTriggersCard extends HaDeviceAutomationCard<DeviceTrigger> {
  readonly type = "trigger";

  readonly headerKey = "ui.panel.config.devices.automation.triggers.caption";

  constructor() {
    super(localizeDeviceAutomationTrigger);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-triggers-card": HaDeviceTriggersCard;
  }
}
