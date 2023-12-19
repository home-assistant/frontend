import {
  mdiAmpersand,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
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
import { AutomationElementGroup } from "./automation";

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
  other: {
    icon: mdiDotsHorizontal,
    members: {
      template: {},
      trigger: {},
    },
  },
} as const;

export const CONDITION_BUILDING_BLOCKS_GROUPS: AutomationElementGroup = {
  and: {},
  or: {},
  not: {},
} as const;
