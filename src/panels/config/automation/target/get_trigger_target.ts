import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { Trigger } from "../../../../data/automation";
import type { TargetSelector } from "../../../../data/selector";
import type { TriggerDescriptions } from "../../../../data/trigger";
import { isTriggerList } from "../../../../data/trigger";
import { getDeviceTarget } from "./get_device_target";
import { getEntityTarget } from "./get_entity_target";

export interface TriggerTarget {
  target?: HassServiceTarget;
  /** The trigger type expects a target, so a missing one is shown as such. */
  targetRequired: boolean;
  targetSpec?: TargetSelector["target"];
}

/**
 * Resolve what a trigger targets: the `target` of platform triggers, the
 * entities of state and numeric state triggers, or the device of device triggers.
 */
export const getTriggerTarget = (
  trigger: Trigger,
  triggerDescriptions: TriggerDescriptions
): TriggerTarget | undefined => {
  if (isTriggerList(trigger)) {
    return undefined;
  }

  const description = triggerDescriptions[trigger.trigger];
  if (description) {
    const targetRequired = "target" in description;
    return {
      target:
        targetRequired && "target" in trigger ? trigger.target : undefined,
      targetRequired,
      targetSpec: description.target,
    };
  }

  if (trigger.trigger === "state" || trigger.trigger === "numeric_state") {
    return {
      target:
        "entity_id" in trigger ? getEntityTarget(trigger.entity_id) : undefined,
      targetRequired: true,
    };
  }

  if (trigger.trigger === "device") {
    return {
      target:
        "device_id" in trigger ? getDeviceTarget(trigger.device_id) : undefined,
      targetRequired: false,
    };
  }

  return undefined;
};
