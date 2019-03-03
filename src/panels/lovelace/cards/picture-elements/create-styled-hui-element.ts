import { LovelaceElement, LovelaceElementConfig } from "../../elements/types";
import { createHuiElement } from "../../common/create-hui-element";

export function createStyledHuiElement(
  elementConfig: LovelaceElementConfig
): LovelaceElement {
  const element = createHuiElement(elementConfig) as LovelaceElement;
  // keep conditional card as a transparent container so let its position remain static
  if (element.tagName !== "HUI-CONDITIONAL-ELEMENT") {
    element.classList.add("element");
  }

  if (elementConfig.style) {
    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });
  }

  return element;
}
