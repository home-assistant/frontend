import { mdiResponsive, mdiStateMachine } from "@mdi/js";
import { Condition } from "./validate-condition";

export const ICON_CONDITION: Record<Condition["condition"], string> = {
  state: mdiStateMachine,
  screen: mdiResponsive,
};
