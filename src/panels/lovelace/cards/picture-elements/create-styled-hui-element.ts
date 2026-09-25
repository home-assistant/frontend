import { createHuiElement } from "../../create-element/create-hui-element";
import type {
  LovelaceElement,
  LovelaceElementConfig,
} from "../../elements/types";

// Element types whose taps the picture-elements card routes to the nearest
// icon/label target. They delegate pointer handling to the card's container
// gesture (keeping keyboard activation for themselves). Marking them here, at
// creation, ensures the routing also covers elements created inside wrappers
// such as hui-conditional-element (which builds its children via this factory).
export const NEAREST_ROUTED_TYPES = new Set([
  "state-icon",
  "state-badge",
  "icon",
  "state-label",
]);

export function createStyledHuiElement(
  elementConfig: LovelaceElementConfig
): LovelaceElement {
  const element = createHuiElement(elementConfig) as LovelaceElement;
  // keep conditional card as a transparent container so let its position remain static
  if (element.tagName !== "HUI-CONDITIONAL-ELEMENT") {
    element.classList.add("element");
  }

  if (NEAREST_ROUTED_TYPES.has(elementConfig.type)) {
    element.delegatedActions = true;
  }

  if (elementConfig.style) {
    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style![prop]);
    });
  }

  return element;
}
