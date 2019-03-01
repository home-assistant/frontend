import { HomeAssistant } from "../../../types";
import { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import { createHuiElement } from "../common/create-hui-element";

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}

export function createConfiguredHuiElement(
  elementConfig: LovelaceElementConfig,
  hass: HomeAssistant
): LovelaceElement {
  const element = createHuiElement(elementConfig) as LovelaceElement;
  element.hass = hass;
  element.classList.add("element");

  if (elementConfig.style) {
    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });
  }

  return element;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if (!(c.entity in hass.states)) {
      return false;
    }
    if (c.state) {
      return hass.states[c.entity].state === c.state;
    }
    return hass!.states[c.entity].state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => ((c.entity && (c.state || c.state_not)) as unknown) as boolean
  );
}
