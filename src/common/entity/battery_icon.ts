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

  // We obscure 'hass' in iconname so this name does not get picked up
  var icon = `${"hass"}:battery`;
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
  // Will return one of the following icons: (listed so extractor picks up)
  // hass:battery-10
  // hass:battery-20
  // hass:battery-30
  // hass:battery-40
  // hass:battery-50
  // hass:battery-60
  // hass:battery-70
  // hass:battery-80
  // hass:battery-90
  // hass:battery-charging-10
  // hass:battery-charging-20
  // hass:battery-charging-30
  // hass:battery-charging-40
  // hass:battery-charging-50
  // hass:battery-charging-60
  // hass:battery-charging-70
  // hass:battery-charging-80
  // hass:battery-charging-90
  // hass:battery-outline
  // hass:battery-alert
};
