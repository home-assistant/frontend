import { isValidEntityId } from "../../../../common/entity/valid_entity_id";
import { HomeAssistant } from "../../../../types";
import { ConditionHandler } from "./handle-condition";
import { LovelaceBaseCondition } from "./types";

function getValueFromEntityId(hass: HomeAssistant, value: string): string {
  if (isValidEntityId(value) && hass.states[value]) {
    return hass.states[value]?.state;
  }
  return value;
}

export type LovelaceNumericStateCondition = LovelaceBaseCondition & {
  condition: "numeric_state";
  entity?: string;
  below?: string | number;
  above?: string | number;
};

export class NumericStateConditionHandler
  implements ConditionHandler<LovelaceNumericStateCondition>
{
  validate(condition: LovelaceNumericStateCondition): boolean {
    return (
      condition.entity != null &&
      (condition.above != null || condition.below != null)
    );
  }

  check(
    condition: LovelaceNumericStateCondition,
    hass: HomeAssistant
  ): boolean {
    const state = (condition.entity ? hass.states[condition.entity] : undefined)
      ?.state;
    let above = condition.above;
    let below = condition.below;

    // Handle entity_id, UI should be updated for conditionnal card (filters does not have UI for now)
    if (typeof above === "string") {
      above = getValueFromEntityId(hass, above) as string;
    }
    if (typeof below === "string") {
      below = getValueFromEntityId(hass, below) as string;
    }

    const numericState = Number(state);
    const numericAbove = Number(above);
    const numericBelow = Number(below);

    if (isNaN(numericState)) {
      return false;
    }

    return (
      (condition.above == null ||
        isNaN(numericAbove) ||
        numericAbove < numericState) &&
      (condition.below == null ||
        isNaN(numericBelow) ||
        numericBelow > numericState)
    );
  }
}
