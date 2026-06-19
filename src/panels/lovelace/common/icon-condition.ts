import {
  mdiAccount,
  mdiAmpersand,
  mdiCalendarClock,
  mdiGateOr,
  mdiMapMarker,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiResponsive,
  mdiStateMachine,
  mdiTimer,
  mdiViewColumnOutline,
} from "@mdi/js";
import type { Condition } from "./validate-condition";

export const ICON_CONDITION: Record<Condition["condition"], string> = {
  view_columns: mdiViewColumnOutline,
  location: mdiMapMarker,
  numeric_state: mdiNumeric,
  state: mdiStateMachine,
  screen: mdiResponsive,
  entity_time: mdiTimer,
  time: mdiCalendarClock,
  user: mdiAccount,
  and: mdiAmpersand,
  not: mdiNotEqualVariant,
  or: mdiGateOr,
};
