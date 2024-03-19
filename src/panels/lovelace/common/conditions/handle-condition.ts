import { HomeAssistant } from "../../../../types";
import { AndConditionHandler } from "./condition-and";
import { NumericStateConditionHandler } from "./condition-numeric-state";
import { OrConditionHandler } from "./condition-or";
import { ScreenConditionHandler } from "./condition-screen";
import { StateConditionHandler } from "./condition-state";
import { UserConditionHandler } from "./condition-user";
import { LovelaceBaseCondition, LovelaceCondition } from "./types";

export interface ConditionHandler<
  T extends LovelaceBaseCondition = LovelaceBaseCondition,
> {
  validate(condition: T): boolean;
  check(condition: T, hass: HomeAssistant): boolean;
}

const HANDLER: Record<LovelaceCondition["condition"], ConditionHandler> = {
  state: new StateConditionHandler(),
  numeric_state: new NumericStateConditionHandler(),
  screen: new ScreenConditionHandler(),
  and: new AndConditionHandler(),
  or: new OrConditionHandler(),
  user: new UserConditionHandler(),
};

export function checkCondition(
  condition: LovelaceCondition,
  hass: HomeAssistant
): boolean {
  return HANDLER[condition.condition].check(condition, hass);
}

export function validateCondition(condition: LovelaceCondition): boolean {
  return HANDLER[condition.condition].validate(condition);
}
