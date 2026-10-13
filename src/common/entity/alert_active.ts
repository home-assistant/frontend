import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "./compute_domain";

export const ALERT_DOMAINS = [
  "alarm_control_panel",
  "binary_sensor",
  "cover",
  "lock",
];

export const DEFAULT_ALERT_COLOR = "red";

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
