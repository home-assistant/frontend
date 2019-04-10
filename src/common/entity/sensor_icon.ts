/** Return an icon representing a sensor state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNIT_C, UNIT_F } from "../const";
import domainIcon from "./domain_icon";

const fixedDeviceClassIcons = {
  humidity: "hass:water-percent",
  illuminance: "hass:brightness-5",
  temperature: "hass:thermometer",
  pressure: "hass:gauge",
  power: "hass:flash",
  signal_strength: "hass:wifi",
};

export default function sensorIcon(state: HassEntity) {
  const dclass = state.attributes.device_class;

  if (dclass && dclass in fixedDeviceClassIcons) {
    return fixedDeviceClassIcons[dclass];
  }
  if (dclass === "battery") {
    const battery = Number(state.state);
    if (isNaN(battery)) {
      return "hass:battery-unknown";
    }
    const batteryRound = Math.round(battery / 10) * 10;
    if (batteryRound >= 100) {
      return "hass:battery";
    }
    if (batteryRound <= 0) {
      return "hass:battery-alert";
    }
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
    // We obscure 'hass' in iconname so this name does not get picked up
    return `${"hass"}:battery-${batteryRound}`;
  }

  const unit = state.attributes.unit_of_measurement;
  if (unit === UNIT_C || unit === UNIT_F) {
    return "hass:thermometer";
  }
  return domainIcon("sensor");
}
