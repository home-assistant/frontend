/** Return an icon representing a sensor state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNIT_C, UNIT_F } from "../const";
import { domainIcon } from "./domain_icon";
import { batteryIcon } from "./battery_icon";

const fixedDeviceClassIcons = {
  humidity: "hass:water-percent",
  illuminance: "hass:brightness-5",
  temperature: "hass:thermometer",
  pressure: "hass:gauge",
  power: "hass:flash",
  signal_strength: "hass:wifi",
};

export const sensorIcon = (state: HassEntity) => {
  const dclass = state.attributes.device_class;

  if (dclass && dclass in fixedDeviceClassIcons) {
    return fixedDeviceClassIcons[dclass];
  }
  if (dclass === "battery") {
    return batteryIcon(state);
  }

  const unit = state.attributes.unit_of_measurement;
  if (unit === UNIT_C || unit === UNIT_F) {
    return "hass:thermometer";
  }
  return domainIcon("sensor");
};
