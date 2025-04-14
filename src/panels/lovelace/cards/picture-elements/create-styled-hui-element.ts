import { createHuiElement } from "../../create-element/create-hui-element";
import type {
  LovelaceElement,
  LovelaceElementConfig,
} from "../../elements/types";

const CONFIG_STYLE_PROPS = ["left", "top"];

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
      element.style.setProperty(prop, elementConfig.style![prop]);
    });
  }

  for (const prop of CONFIG_STYLE_PROPS) {
    if (elementConfig[prop]) {
      element.style.setProperty(prop, `${elementConfig[prop]}%`);
    }
  }

  return element;
}
