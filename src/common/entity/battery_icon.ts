/** Return an icon representing a battery state. */
import { HassEntity } from "home-assistant-js-websocket";

export const batteryIcon = (
  batteryState: HassEntity,
  batteryChargingState?: HassEntity
) => {
  const battery = Number(batteryState.state);
  const battery_charging =
    batteryChargingState && batteryChargingState.state === "on";

  if (isNaN(battery)) {
    return "hass:battery-unknown";
  }

  let icon = "hass:battery";
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
