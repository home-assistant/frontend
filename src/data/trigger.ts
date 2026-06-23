import { mdiClockOutline, mdiShape, mdiWeatherSunny } from "@mdi/js";
import type { Connection } from "home-assistant-js-websocket";

import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type {
  AutomationElementGroupCollection,
  Trigger,
  TriggerList,
} from "./automation";
import type { Selector, TargetSelector } from "./selector";

export const TRIGGER_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      dynamicGroups: {},
      time: {
        icon: mdiClockOutline,
        members: {
          time: {},
          time_pattern: {},
        },
        domains: ["calendar", "schedule"],
      },
      sun: {
        icon: mdiWeatherSunny,
        domains: ["sun"],
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
  connection: Connection,
  callback: (triggers: TriggerDescriptions) => void
) =>
  connection.subscribeMessage<TriggerDescriptions>(callback, {
    type: "trigger_platforms/subscribe",
  });

export const getTriggerDomain = (trigger: string) =>
  trigger.includes(".") ? computeDomain(trigger) : trigger;

export const getTriggerObjectId = (trigger: string) =>
  trigger.includes(".") ? computeObjectId(trigger) : "_";
