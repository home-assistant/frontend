import ButtonGroup from "@awesome.me/webawesome/dist/components/button-group/button-group";
import { customElement } from "lit/decorators";
import type { HaButton } from "./ha-button";

export type Appearance = "accent" | "filled" | "outlined" | "plain";

/**
 * Finds an ha-button element either as the current element or within its descendants.
 * @param el - The HTML element to search from
 * @returns The found HaButton element, or null if not found
 */
function findButton(el: HTMLElement) {
  const selector = "ha-button";
  return (el.closest(selector) ?? el.querySelector(selector)) as HaButton;
}

/**
 * @element ha-button-group
 * @extends {ButtonGroup}
 * @summary
 * Group buttons. Extend Webawesome to be able to work with ha-button tags
 *
 * @documentation https://webawesome.com/components/button-group
 */
@customElement("ha-button-group") // @ts-expect-error Intentionally overriding private methods
export class HaButtonGroup extends ButtonGroup {
  // @ts-expect-error updateClassNames is used in super class
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private override updateClassNames() {
    const slottedElements = [
      ...this.defaultSlot.assignedElements({ flatten: true }),
    ] as HTMLElement[];
    this.hasOutlined = false;

    slottedElements.forEach((el) => {
      const index = slottedElements.indexOf(el);
      const button = findButton(el);

      if (button) {
        if ((button as HaButton).appearance === "outlined")
          this.hasOutlined = true;
        if (this.size) button.setAttribute("size", this.size);
        button.classList.add("wa-button-group__button");
        button.classList.toggle(
          "wa-button-group__horizontal",
          this.orientation === "horizontal"
        );
        button.classList.toggle(
          "wa-button-group__vertical",
          this.orientation === "vertical"
        );
        button.classList.toggle("wa-button-group__button-first", index === 0);
        button.classList.toggle(
          "wa-button-group__button-inner",
          index > 0 && index < slottedElements.length - 1
        );
        button.classList.toggle(
          "wa-button-group__button-last",
          index === slottedElements.length - 1
        );

        // use button-group variant
        button.setAttribute("variant", this.variant);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-group": HaButtonGroup;
  }
}
