import { HomeAssistant } from "../../../../types";
import { ConditionHandler, checkCondition } from "./handle-condition";
import { LovelaceBaseCondition, LovelaceCondition } from "./types";

export type LovelaceOrCondition = LovelaceBaseCondition & {
  condition: "or";
  conditions?: LovelaceCondition[];
};

export class OrConditionHandler
  implements ConditionHandler<LovelaceOrCondition>
{
  validate(condition: LovelaceOrCondition): boolean {
    return condition.conditions != null;
  }

  check(condition: LovelaceOrCondition, hass: HomeAssistant): boolean {
    if (!condition.conditions) return true;
    return condition.conditions.some((c) => checkCondition(c, hass));
  }
}
