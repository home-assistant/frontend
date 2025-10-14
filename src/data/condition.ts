import {
  mdiAmpersand,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
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
import type { AutomationElementGroupCollection } from "./automation";

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

export const CONDITION_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      device: {},
      entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
      time_location: {
        icon: mdiMapClock,
        members: { sun: {}, time: {}, zone: {} },
      },
    },
  },
  {
    titleKey:
      "ui.panel.config.automation.editor.conditions.groups.building_blocks.label",
    groups: {
      and: {},
      or: {},
      not: {},
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

export const CONDITION_BUILDING_BLOCKS = ["and", "or", "not"];

export const COLLAPSIBLE_CONDITION_ELEMENTS = [
  "ha-automation-condition-and",
  "ha-automation-condition-not",
  "ha-automation-condition-or",
];
