/** Return an icon representing a battery state. */
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
  mdiBatteryAlert,
  mdiBatteryAlertVariantOutline,
  mdiBatteryCharging,
  mdiBatteryCharging10,
  mdiBatteryCharging20,
  mdiBatteryCharging30,
  mdiBatteryCharging40,
  mdiBatteryCharging50,
  mdiBatteryCharging60,
  mdiBatteryCharging70,
  mdiBatteryCharging80,
  mdiBatteryCharging90,
  mdiBatteryChargingOutline,
  mdiBatteryUnknown,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";

const BATTERY_ICONS = {
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
  10: mdiBatteryCharging10,
  20: mdiBatteryCharging20,
  30: mdiBatteryCharging30,
  40: mdiBatteryCharging40,
  50: mdiBatteryCharging50,
  60: mdiBatteryCharging60,
  70: mdiBatteryCharging70,
  80: mdiBatteryCharging80,
  90: mdiBatteryCharging90,
  100: mdiBatteryCharging,
};

export const batteryStateIcon = (
  batteryState: HassEntity,
  batteryChargingState?: HassEntity
) => {
  const battery = batteryState.state;
  const batteryCharging =
    batteryChargingState && batteryChargingState.state === "on";

  return batteryIcon(battery, batteryCharging);
};

export const batteryIcon = (
  batteryState: number | string,
  batteryCharging?: boolean
) => {
  const batteryValue = Number(batteryState);
  if (isNaN(batteryValue)) {
    if (batteryState === "off") {
      return mdiBattery;
    }
    if (batteryState === "on") {
      return mdiBatteryAlert;
    }
    return mdiBatteryUnknown;
  }

  const batteryRound = Math.round(batteryValue / 10) * 10;
  if (batteryCharging && batteryValue >= 10) {
    return BATTERY_CHARGING_ICONS[batteryRound];
  }
  if (batteryCharging) {
    return mdiBatteryChargingOutline;
  }
  if (batteryValue <= 5) {
    return mdiBatteryAlertVariantOutline;
  }
  return BATTERY_ICONS[batteryRound];
};
