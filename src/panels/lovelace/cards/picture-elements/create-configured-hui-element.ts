import { HomeAssistant } from "../../../../types";
import { LovelaceElement, LovelaceElementConfig } from "../../elements/types";
import { createHuiElement } from "../../common/create-hui-element";

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
