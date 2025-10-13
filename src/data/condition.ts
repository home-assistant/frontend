import {
  mdiAmpersand,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
  mdiExcavator,
  mdiGateOr,
  mdiIdentifier,
  mdiMapClock,
  mdiMapMarkerRadius,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiShape,
  mdiStateMachine,
  mdiWeatherSunny,
} from "@mdi/js";
import type { AutomationElementGroup } from "./automation";

export const CONDITION_ICONS = {
  device: mdiDevices,
  and: mdiAmpersand,
  or: mdiGateOr,
  not: mdiNotEqualVariant,
  state: mdiStateMachine,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  trigger: mdiIdentifier,
  zone: mdiMapMarkerRadius,
};

export const CONDITION_GROUPS: AutomationElementGroup = {
  device: {},
  entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
  time_location: {
    icon: mdiMapClock,
    members: { sun: {}, time: {}, zone: {} },
  },
  building_blocks: {
    icon: mdiExcavator,
    members: { and: {}, or: {}, not: {} },
  },
  other: {
    icon: mdiDotsHorizontal,
    members: {
      template: {},
      trigger: {},
    },
  },
} as const;

export const CONDITION_BUILDING_BLOCKS = ["and", "or", "not"];

export const COLLAPSIBLE_CONDITION_ELEMENTS = [
  "ha-automation-condition-and",
  "ha-automation-condition-not",
  "ha-automation-condition-or",
];
