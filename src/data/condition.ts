import { mdiMapClock, mdiShape } from "@mdi/js";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type { HomeAssistant } from "../types";
import type { AutomationElementGroupCollection } from "./automation";
import type { Selector, TargetSelector } from "./selector";

export const CONDITION_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      device: {},
      dynamicGroups: {},
      entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
      time_location: {
        icon: mdiMapClock,
        members: { sun: {}, time: {}, zone: {} },
      },
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.conditions.groups.other.label",
    groups: {
      template: {},
      trigger: {},
    },
  },
] as const;

export const CONDITION_BUILDING_BLOCKS_GROUP = {
  and: {},
  or: {},
  not: {},
};

export const CONDITION_BUILDING_BLOCKS = ["and", "or", "not"];

export const COLLAPSIBLE_CONDITION_ELEMENTS = [
  "ha-automation-condition-and",
  "ha-automation-condition-not",
  "ha-automation-condition-or",
];

export interface ConditionDescription {
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

export type ConditionDescriptions = Record<string, ConditionDescription>;

export const subscribeConditions = (
  hass: HomeAssistant,
  callback: (conditions: ConditionDescriptions) => void
) =>
  hass.connection.subscribeMessage<ConditionDescriptions>(callback, {
    type: "condition_platforms/subscribe",
  });

export const getConditionDomain = (condition: string) =>
  condition.includes(".") ? computeDomain(condition) : condition;

export const getConditionObjectId = (condition: string) =>
  condition.includes(".") ? computeObjectId(condition) : "_";
