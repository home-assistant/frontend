import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { TraceNodeType } from "../../data/trace-tree";
import { getDeviceTarget } from "../../panels/config/automation/target/get_device_target";
import { getEntityTarget } from "../../panels/config/automation/target/get_entity_target";

/**
 * Get the target to show for a trace step, based on its config.
 */
export const getTraceNodeTarget = (
  config: any,
  type?: TraceNodeType
): HassServiceTarget | undefined => {
  if (config.target) {
    return config.target;
  }
  if (type === "trigger" || type === "condition") {
    const element = type === "trigger" ? config.trigger : config.condition;
    if (element === "state" || element === "numeric_state") {
      return getEntityTarget(config.entity_id);
    }
    if (element === "device") {
      return getDeviceTarget(config.device_id);
    }
    return undefined;
  }
  if (type === "action") {
    // Device actions store the entity registry id (not the entity id) in
    // entity_id, so show the device instead, like the action editor does.
    if (config.device_id) {
      return getDeviceTarget(config.device_id);
    }
    return getEntityTarget(config.entity_id);
  }
  return undefined;
};
