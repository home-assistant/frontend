import {
  mdiAccount,
  mdiAmpersand,
  mdiGateOr,
  mdiNumeric,
  mdiResponsive,
  mdiStateMachine,
  mdiTimelineClock,
} from "@mdi/js";
import type { Condition } from "./validate-condition";

export const ICON_CONDITION: Record<Condition["condition"], string> = {
  numeric_state: mdiNumeric,
  last_changed_state: mdiTimelineClock,
  state: mdiStateMachine,
  screen: mdiResponsive,
  user: mdiAccount,
  and: mdiAmpersand,
  or: mdiGateOr,
};
