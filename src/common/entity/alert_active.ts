import type { HassEntity } from "home-assistant-js-websocket";
import { computeCssColor } from "../color/compute-color";
import { computeDomain } from "./compute_domain";
import { stateColorCss } from "./state_color";

export const ALERT_DOMAINS = [
  "alarm_control_panel",
  "binary_sensor",
  "cover",
  "lock",
];

export const computeAlertActiveStates = (entityId: string): string[] => {
  switch (computeDomain(entityId)) {
    case "alarm_control_panel":
      return ["triggered"];
    case "cover":
      return ["open"];
    case "lock":
      return ["jammed", "unlocked", "open"];
    default:
      return ["on"];
  }
};

export const isAlertActive = (stateObj: HassEntity): boolean =>
  computeAlertActiveStates(stateObj.entity_id).includes(stateObj.state);

export const computeAlertColor = (
  stateObj: HassEntity,
  color: string
): string | undefined => {
  if (color === "none") {
    return undefined;
  }
  if (color === "state") {
    return stateColorCss(stateObj);
  }
  return computeCssColor(color);
};
