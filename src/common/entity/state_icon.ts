import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "./compute_state_domain";
import { updateIcon } from "./update_icon";
import { deviceTrackerIcon } from "./device_tracker_icon";
import { batteryIcon } from "./battery_icon";

export const stateIcon = (
  stateObj: HassEntity,
  state?: string
): string | undefined => {
  const domain = computeStateDomain(stateObj);
  const compareState = state ?? stateObj.state;
  const dc = stateObj.attributes.device_class;
  switch (domain) {
    case "update":
      return updateIcon(stateObj, compareState);

    case "sensor":
      if (dc === "battery") {
        return batteryIcon(stateObj, compareState);
      }
      break;

    case "device_tracker":
      return deviceTrackerIcon(stateObj, compareState);

    case "sun":
      return compareState === "above_horizon"
        ? "mdi:white-balance-sunny"
        : "mdi:weather-night";

    case "input_datetime":
      if (!stateObj.attributes.has_date) {
        return "mdi:clock";
      }
      if (!stateObj.attributes.has_time) {
        return "mdi:calendar";
      }
      break;
  }
  return undefined;
};
