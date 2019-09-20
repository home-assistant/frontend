import { customElement } from "lit-element";
import {
  DeviceAction,
  fetchDeviceActions,
  localizeDeviceAutomationAction,
} from "../../../../data/device_automation";

import "../../../../components/ha-card";

import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-actions-card")
export class HaDeviceActionsCard extends HaDeviceAutomationCard<DeviceAction> {
  protected headerKey = "ui.panel.config.devices.automation.actions.caption";
  protected noAutomationHeaderKey =
    "ui.panel.config.devices.automation.actions.no_actions";

  constructor() {
    super(localizeDeviceAutomationAction, fetchDeviceActions);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-card": HaDeviceActionsCard;
  }
}
