import { HassEntity } from "home-assistant-js-websocket";

export const deviceTrackerIcon = (stateObj: HassEntity, state?: string) => {
  const compareState = state ?? stateObj.state;
  if (stateObj?.attributes.source_type === "router") {
    return compareState === "home" ? "mdi:lan-connect" : "mdi:lan-disconnect";
  }
  if (
    ["bluetooth", "bluetooth_le"].includes(stateObj?.attributes.source_type)
  ) {
    return compareState === "home" ? "mdi:bluetooth-connect" : "mdi:bluetooth";
  }
  return compareState === "not_home"
    ? "mdi:account-arrow-right"
    : "mdi:account";
};
