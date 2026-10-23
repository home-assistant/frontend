import { CONDITION_ICONS } from "../../../../components/ha-condition-icon";
import { TRIGGER_ICONS } from "../../../../components/ha-trigger-icon";
import {
  ACTION_BUILDING_BLOCKS_GROUP,
  ACTION_COLLECTIONS,
  ACTION_ICONS,
} from "../../../../data/action";
import {
  DYNAMIC_PREFIX,
  type AutomationElementGroup,
  type AutomationElementGroupCollection,
} from "../../../../data/automation";
import {
  CONDITION_BUILDING_BLOCKS_GROUP,
  CONDITION_COLLECTIONS,
} from "../../../../data/condition";
import { TRIGGER_COLLECTIONS } from "../../../../data/trigger";
import type { AddElementType } from "./types";

export const ELEMENT_TYPES: Record<
  AddElementType,
  {
    collections: AutomationElementGroupCollection[];
    icons: Record<string, string>;
  }
> = {
  trigger: { collections: TRIGGER_COLLECTIONS, icons: TRIGGER_ICONS },
  condition: { collections: CONDITION_COLLECTIONS, icons: CONDITION_ICONS },
  action: { collections: ACTION_COLLECTIONS, icons: ACTION_ICONS },
};

export const BUILDING_BLOCKS: Record<AddElementType, AutomationElementGroup> = {
  trigger: {},
  condition: CONDITION_BUILDING_BLOCKS_GROUP,
  action: ACTION_BUILDING_BLOCKS_GROUP,
};

// Entity domains always listed for triggers and conditions, even without
// matching entities.
export const ENTITY_DOMAINS_OTHER = new Set([
  "date",
  "datetime",
  "device_tracker",
  "text",
  "time",
  "tts",
  "update",
  "weather",
  "image_processing",
]);

export const ENTITY_DOMAINS_MAIN = new Set(["notify"]);

// Placeholder groups of a collection that are replaced by generated domain groups
export const DYNAMIC_KEYWORDS = [
  "dynamicGroups",
  "helpers",
  "integrationGroups",
];

// Dynamic domain groups listed in the generic collection instead
export const DYNAMIC_TO_GENERIC = new Set([`${DYNAMIC_PREFIX}event`]);

export const MAX_RECENT_ELEMENTS = 4;

export const RECENT_ELEMENTS_STORAGE_KEY = "automation-recent-elements";

// Group keys surfaced in the "Other" section of the "by target" tab because
// their elements have no target (time/calendar/schedule, sun). Picking one
// drills into its items, like selecting the matching group in the "by type" tab.
// People are shown in the same section by ha-automation-add-from-target.
export const TIME_LOCATION_GROUPS = ["time", "sun"];

export const NUMERIC_DOMAINS = ["counter", "input_number", "number", "sensor"];
