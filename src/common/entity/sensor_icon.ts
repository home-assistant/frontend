/** Return an icon representing a sensor state. */
import { mdiBattery, mdiThermometer } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { SENSOR_DEVICE_CLASS_BATTERY } from "../../data/sensor";
import { FIXED_DEVICE_CLASS_ICONS, UNIT_C, UNIT_F } from "../const";
import { batteryStateIcon } from "./battery_icon";

export const sensorIcon = (stateObj?: HassEntity): string | undefined => {
  const dclass = stateObj?.attributes.device_class;

  if (dclass && dclass in FIXED_DEVICE_CLASS_ICONS) {
    return FIXED_DEVICE_CLASS_ICONS[dclass];
  }

  if (dclass === SENSOR_DEVICE_CLASS_BATTERY) {
    return stateObj ? batteryStateIcon(stateObj) : mdiBattery;
  }

  const unit = stateObj?.attributes.unit_of_measurement;
  if (unit === UNIT_C || unit === UNIT_F) {
    return mdiThermometer;
  }

  return undefined;
};
