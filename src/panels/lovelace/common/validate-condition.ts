import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { RenderTemplateResult } from "../../../data/ws-templates";

export interface Condition {
  entity?: string;
  state?: string;
  state_not?: string;
  template?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant,
  templateResults: Record<string, RenderTemplateResult>
): boolean {
  return conditions.every((c) => {
    if (c.template) {
      const result = templateResults[c.template!];
      return result ? result?.result : false;
    }

    const state = hass.states[c.entity!]
      ? hass!.states[c.entity!].state
      : UNAVAILABLE;

    return c.state ? state === c.state : state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) =>
      c.template ||
      ((c.entity && (c.state || c.state_not)) as unknown as boolean)
  );
}
