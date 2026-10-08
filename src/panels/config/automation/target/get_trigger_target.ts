import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PlatformTrigger, Trigger } from "../../../../data/automation";
import type { TargetSelector } from "../../../../data/selector";
import type {
  TriggerDescription,
  TriggerDescriptions,
} from "../../../../data/trigger";
import { isTriggerList } from "../../../../data/trigger";

export interface PlatformTriggerTarget {
  trigger: PlatformTrigger;
  description: TriggerDescription;
  target?: HassServiceTarget;
  targetRequired: boolean;
  targetSpec?: TargetSelector["target"];
}

/**
 * Resolve the description and target of a platform trigger. Legacy triggers
 * return undefined because their description already names what they watch.
 */
export const getPlatformTriggerTarget = (
  trigger: Trigger,
  triggerDescriptions: TriggerDescriptions
): PlatformTriggerTarget | undefined => {
  if (isTriggerList(trigger) || !(trigger.trigger in triggerDescriptions)) {
    return undefined;
  }
  const platformTrigger = trigger as PlatformTrigger;
  const description = triggerDescriptions[platformTrigger.trigger];
  const targetRequired = "target" in description;
  return {
    trigger: platformTrigger,
    description,
    target: targetRequired ? platformTrigger.target : undefined,
    targetRequired,
    targetSpec: description.target,
  };
};
