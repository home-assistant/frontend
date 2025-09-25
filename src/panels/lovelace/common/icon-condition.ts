import {
  mdiAccount,
  mdiAmpersand,
  mdiGateOr,
  mdiLink,
  mdiMapMarker,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiResponsive,
  mdiStateMachine,
} from "@mdi/js";
import type { Condition } from "./validate-condition";

export const ICON_CONDITION: Record<Condition["condition"], string> = {
  location: mdiMapMarker,
  numeric_state: mdiNumeric,
  state: mdiStateMachine,
  screen: mdiResponsive,
  user: mdiAccount,
  url_hash: mdiLink,
  and: mdiAmpersand,
  not: mdiNotEqualVariant,
  or: mdiGateOr,
};
