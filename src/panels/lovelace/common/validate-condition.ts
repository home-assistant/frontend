import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export type Condition = StateCondition | ResponsiveCondition;

export type StateCondition = {
  condition: "state";
  entity: string;
  state?: string;
  state_not?: string;
};

export type ResponsiveCondition = {
  condition: "responsive";
  min_width?: number;
  max_width?: number;
};

function checkStateCondition(condition: StateCondition, hass: HomeAssistant) {
  const state = hass.states[condition.entity]
    ? hass.states[condition.entity].state
    : UNAVAILABLE;

  return condition.state != null
    ? state === condition.state
    : state !== condition.state_not;
}

export function buildMediaQuery(condition: ResponsiveCondition) {
  const queries: string[] = [];
  if (condition.min_width != null) {
    queries.push(`(min-width: ${condition.min_width}px)`);
  }
  if (condition.max_width != null) {
    queries.push(`(max-width: ${condition.max_width}px)`);
  }
  return queries.join(" and ");
}

function checkResponsiveCondition(
  condition: ResponsiveCondition,
  _hass: HomeAssistant
) {
  const query = buildMediaQuery(condition);
  return matchMedia(query).matches;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if (c.condition === "responsive") {
      return checkResponsiveCondition(c, hass);
    }

    return checkStateCondition(c, hass);
  });
}

function valideStateCondition(condition: StateCondition) {
  return (condition.entity &&
    (condition.state != null ||
      condition.state_not != null)) as unknown as boolean;
}

function valideResponsiveCondition(condition: ResponsiveCondition) {
  return (condition.min_width != null ||
    condition.max_width != null) as unknown as boolean;
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every((c) => {
    if (c.condition === "responsive") {
      return valideResponsiveCondition(c);
    }
    return valideStateCondition(c);
  });
}
