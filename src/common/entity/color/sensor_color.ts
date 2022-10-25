import { HassEntity } from "home-assistant-js-websocket";
import { batteryStateColor } from "./battery_color";

export const sensorColor = (stateObj: HassEntity): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  if (deviceClass === "battery") {
    return batteryStateColor(stateObj);
  }

  switch (deviceClass) {
    case "apparent_power":
    case "current":
    case "energy":
    case "gas":
    case "power_factor":
    case "power":
    case "reactive_power":
    case "voltage":
      return "sensor-energy";
    case "temperature":
      return "sensor-temperature";
    case "humidity":
      return "sensor-humidity";
    case "illuminance":
      return "sensor-illuminance";
    case "moisture":
      return "sensor-moisture";
  }

  return "sensor";
};
