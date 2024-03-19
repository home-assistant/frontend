import { HomeAssistant } from "../../../../types";
import { ConditionHandler, checkCondition } from "./handle-condition";
import { LovelaceBaseCondition, LovelaceCondition } from "./types";

export type LovelaceAndCondition = LovelaceBaseCondition & {
  condition: "and";
  conditions?: LovelaceCondition[];
};

export class AndConditionHandler
  implements ConditionHandler<LovelaceAndCondition>
{
  validate(condition: LovelaceAndCondition): boolean {
    return condition.conditions != null;
  }

  check(condition: LovelaceAndCondition, hass: HomeAssistant): boolean {
    if (!condition.conditions) return true;
    return condition.conditions.every((c) => checkCondition(c, hass));
  }
}
