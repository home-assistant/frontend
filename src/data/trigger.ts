import { mdiMapClock, mdiShape } from "@mdi/js";

import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type { HomeAssistant } from "../types";
import type {
  AutomationElementGroupCollection,
  Trigger,
  TriggerList,
} from "./automation";
import { flattenTriggers } from "./automation";
import type { Selector, TargetSelector } from "./selector";

export const TRIGGER_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      dynamicGroups: {},
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
      event: {},
      geo_location: {},
      homeassistant: {},
      conversation: {},
      tag: {},
      template: {},
      webhook: {},
      persistent_notification: {},
      helpers: {},
      other: {},
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.triggers.groups.generic.label",
    generic: true,
    groups: {
      device: {},
      entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
    },
  },
  {
    titleKey:
      "ui.panel.config.automation.editor.triggers.groups.custom_integrations.label",
    groups: {
      customDynamicGroups: {},
    },
  },
] as const;

export const isTriggerList = (trigger: Trigger): trigger is TriggerList =>
  "triggers" in trigger;

export const getTriggerIds = (triggers: Trigger[]): string[] =>
  flattenTriggers(triggers)
    .map((trigger) => trigger.id)
    .filter((id): id is string => !!id);

export const getNextNumericTriggerId = (triggers: Trigger[]): string => {
  let max = 0;
  for (const id of getTriggerIds(triggers)) {
    const num = Number(id);
    if (Number.isInteger(num) && num > max) {
      max = num;
    }
  }
  return String(max + 1);
};

const computeUniqueId = (id: string, existing: Set<string>): string => {
  if (!existing.has(id)) {
    return id;
  }

  // Split into a base and a trailing integer suffix so we can bump the
  // suffix on collision (e.g. "foo2" -> "foo3"); if there's no trailing
  // digit we start at 2 ("foo" -> "foo2").
  const match = id.match(/^(.*?)(\d+)$/);
  let base: string;
  let num: number;
  if (match) {
    base = match[1];
    num = Number(match[2]) + 1;
  } else {
    base = id;
    num = 2;
  }
  while (existing.has(`${base}${num}`)) {
    num++;
  }
  return `${base}${num}`;
};

export const getUniqueTriggerId = (id: string, triggers: Trigger[]): string =>
  computeUniqueId(id, new Set(getTriggerIds(triggers)));

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
