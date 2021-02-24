/** Return an icon representing a battery state. */
import { HassEntity } from "home-assistant-js-websocket";

export const batteryIcon = (
  batteryState: HassEntity,
  batteryChargingState?: HassEntity
) => {
  const battery = Number(batteryState.state);
  const battery_charging =
    batteryChargingState && batteryChargingState.state === "on";
  let icon = "hass:battery";

  if (isNaN(battery)) {
    if (batteryState.state === "off") {
      icon += "-full";
    } else if (batteryState.state === "on") {
      icon += "-alert";
    } else {
      icon += "-unknown";
    }
    return icon;
  }

  const batteryRound = Math.round(battery / 10) * 10;
  if (battery_charging && battery > 10) {
    icon += `-charging-${batteryRound}`;
  } else if (battery_charging) {
    icon += "-outline";
  } else if (battery <= 5) {
    icon += "-alert";
  } else if (battery > 5 && battery < 95) {
    icon += `-${batteryRound}`;
  }
  return icon;
};
