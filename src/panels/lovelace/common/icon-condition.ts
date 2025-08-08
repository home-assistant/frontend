import {
  mdiAccount,
  mdiAmpersand,
  mdiGateOr,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiResponsive,
  mdiStateMachine,
} from "@mdi/js";
import type { Condition } from "./validate-condition";

export const ICON_CONDITION: Record<Condition["condition"], string> = {
  numeric_state: mdiNumeric,
  state: mdiStateMachine,
  screen: mdiResponsive,
  user: mdiAccount,
  and: mdiAmpersand,
  not: mdiNotEqualVariant,
  or: mdiGateOr,
};
