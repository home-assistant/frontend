import { customElement } from "lit/decorators";
import "../../../../components/ha-card";
import {
  DeviceAction,
  localizeDeviceAutomationAction,
} from "../../../../data/device_automation";
import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-actions-card")
export class HaDeviceActionsCard extends HaDeviceAutomationCard<DeviceAction> {
  protected type = "action";

  protected headerKey = "ui.panel.config.devices.automation.actions.caption";

  constructor() {
    super(localizeDeviceAutomationAction);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-card": HaDeviceActionsCard;
  }
}
