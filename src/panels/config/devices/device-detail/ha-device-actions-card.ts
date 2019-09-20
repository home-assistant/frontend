import { customElement } from "lit-element";
import {
  DeviceAction,
  fetchDeviceActions,
  localizeDeviceAutomationAction,
} from "../../../../data/device_automation";

import "../../../../components/ha-card";

import { HaDeviceAutomationCard } from "./ha-device-automation-card";

@customElement("ha-device-triggers-card")
export class HaDeviceActionsCard extends HaDeviceAutomationCard<DeviceAction> {
  constructor() {
    super(localizeDeviceAutomationAction, fetchDeviceActions);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-card": HaDeviceActionsCard;
  }
}
