import { ensureArray } from "../../../../common/array/ensure-array";
import { isValidEntityId } from "../../../../common/entity/valid_entity_id";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";
import { ConditionHandler } from "./handle-condition";
import { LovelaceBaseCondition } from "./types";

function getValueFromEntityId(hass: HomeAssistant, value: string): string {
  if (isValidEntityId(value) && hass.states[value]) {
    return hass.states[value]?.state;
  }
  return value;
}

export type LovelaceStateCondition = LovelaceBaseCondition & {
  condition: "state";
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
};

export class StateConditionHandler
  implements ConditionHandler<LovelaceStateCondition>
{
  validate(condition: LovelaceStateCondition): boolean {
    return (
      condition.entity != null &&
      (condition.state != null || condition.state_not != null)
    );
  }

  check(condition: LovelaceStateCondition, hass: HomeAssistant): boolean {
    const state =
      condition.entity && hass.states[condition.entity]
        ? hass.states[condition.entity].state
        : UNAVAILABLE;
    let value = condition.state ?? condition.state_not;

    if (typeof value === "string") {
      value = getValueFromEntityId(hass, value);
    }
    if (Array.isArray(value)) {
      value = value.map((val) => getValueFromEntityId(hass, val));
    }

    return condition.state != null
      ? ensureArray(value).includes(state)
      : !ensureArray(value).includes(state);
  }
}
