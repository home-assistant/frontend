import { ActionConfig } from "../../../data/lovelace/config/action";
import { ConfigEntity } from "../cards/types";

export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}

export function hasAnyAction(config: ConfigEntity): boolean {
  return (
    !config.tap_action ||
    hasAction(config.tap_action) ||
    hasAction(config.hold_action) ||
    hasAction(config.double_tap_action)
  );
}
