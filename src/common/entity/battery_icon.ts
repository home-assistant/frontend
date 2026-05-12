import {
  mdiBattery,
  mdiBattery10,
  mdiBattery20,
  mdiBattery30,
  mdiBattery40,
  mdiBattery50,
  mdiBattery60,
  mdiBattery70,
  mdiBattery80,
  mdiBattery90,
  mdiBatteryAlertVariantOutline,
  mdiBatteryUnknown,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";

const BATTERY_ICONS = {
  10: "mdi:battery-10",
  20: "mdi:battery-20",
  30: "mdi:battery-30",
  40: "mdi:battery-40",
  50: "mdi:battery-50",
  60: "mdi:battery-60",
  70: "mdi:battery-70",
  80: "mdi:battery-80",
  90: "mdi:battery-90",
  100: "mdi:battery",
};
const BATTERY_ICON_PATHS = {
  10: mdiBattery10,
  20: mdiBattery20,
  30: mdiBattery30,
  40: mdiBattery40,
  50: mdiBattery50,
  60: mdiBattery60,
  70: mdiBattery70,
  80: mdiBattery80,
  90: mdiBattery90,
  100: mdiBattery,
};
const BATTERY_CHARGING_ICONS = {
  10: "mdi:battery-charging-10",
  20: "mdi:battery-charging-20",
  30: "mdi:battery-charging-30",
  40: "mdi:battery-charging-40",
  50: "mdi:battery-charging-50",
  60: "mdi:battery-charging-60",
  70: "mdi:battery-charging-70",
  80: "mdi:battery-charging-80",
  90: "mdi:battery-charging-90",
  100: "mdi:battery-charging",
};

export const batteryIcon = (stateObj: HassEntity, state?: string) => {
  const level = state ?? stateObj.state;
  return batteryLevelIcon(level);
};

export const batteryLevelIcon = (
  batteryLevel: number | string,
  isBatteryCharging?: boolean
): string => {
  const batteryValue = Number(batteryLevel);
  if (isNaN(batteryValue)) {
    if (batteryLevel === "off") {
      return "mdi:battery";
    }
    if (batteryLevel === "on") {
      return "mdi:battery-alert";
    }
    return "mdi:battery-unknown";
  }

  const batteryRound = Math.round(batteryValue / 10) * 10;
  if (isBatteryCharging && batteryValue >= 10) {
    return BATTERY_CHARGING_ICONS[batteryRound];
  }
  if (isBatteryCharging) {
    return "mdi:battery-charging-outline";
  }
  if (batteryValue <= 5) {
    return "mdi:battery-alert-variant-outline";
  }
  return BATTERY_ICONS[batteryRound];
};

export const batteryLevelIconPath = (batteryLevel: number | string): string => {
  const batteryValue = Number(batteryLevel);
  if (isNaN(batteryValue)) {
    return mdiBatteryUnknown;
  }
  if (batteryValue <= 5) {
    return mdiBatteryAlertVariantOutline;
  }
  const batteryRound = Math.round(batteryValue / 10) * 10;
  return BATTERY_ICON_PATHS[batteryRound];
};
