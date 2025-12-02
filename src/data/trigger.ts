import { mdiMapClock, mdiShape } from "@mdi/js";

import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type { HomeAssistant } from "../types";
import type {
  AutomationElementGroupCollection,
  Trigger,
  TriggerList,
} from "./automation";
import type { Selector, TargetSelector } from "./selector";

export const TRIGGER_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      device: {},
      dynamicGroups: {},
      entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
      time_location: {
        icon: mdiMapClock,
        members: {
          calendar: {},
          sun: {},
          time: {},
          time_pattern: {},
          zone: {},
        },
      },
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.triggers.groups.helpers.label",
    groups: {
      helpers: {},
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.triggers.groups.other.label",
    groups: {
      event: {},
      geo_location: {},
      homeassistant: {},
      conversation: {},
      tag: {},
      template: {},
      webhook: {},
      persistent_notification: {},
      other: {},
    },
  },
] as const;

export const isTriggerList = (trigger: Trigger): trigger is TriggerList =>
  "triggers" in trigger;

export interface TriggerDescription {
  target?: TargetSelector["target"];
  fields: Record<
    string,
    {
      example?: string | boolean | number;
      default?: unknown;
      required?: boolean;
      selector?: Selector;
      context?: Record<string, string>;
    }
  >;
}

export type TriggerDescriptions = Record<string, TriggerDescription>;

export const subscribeTriggers = (
  hass: HomeAssistant,
  callback: (triggers: TriggerDescriptions) => void
) =>
  hass.connection.subscribeMessage<TriggerDescriptions>(callback, {
    type: "trigger_platforms/subscribe",
  });

export const getTriggerDomain = (trigger: string) =>
  trigger.includes(".") ? computeDomain(trigger) : trigger;

export const getTriggerObjectId = (trigger: string) =>
  trigger.includes(".") ? computeObjectId(trigger) : "_";
