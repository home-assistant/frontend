import {
  mdiAccount,
  mdiAmpersand,
  mdiGateOr,
  mdiMapMarker,
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
  and: mdiAmpersand,
  or: mdiGateOr,
};
