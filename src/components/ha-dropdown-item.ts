import DropdownItem from "@home-assistant/webawesome/dist/components/dropdown-item/dropdown-item";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

/**
 * Home Assistant dropdown item component
 *
 * @element ha-dropdown-item
 * @extends {DropdownItem}
 *
 * @summary
 * A stylable dropdown item component supporting Home Assistant theming, variants, and appearances based on webawesome dropdown item.
 *
 */
@customElement("ha-dropdown-item")
export class HaDropdownItem extends DropdownItem {
  static get styles(): CSSResultGroup {
    return [
      DropdownItem.styles,
      css`
        :host {
          min-height: var(--ha-space-10);
        }

        #icon ::slotted(*) {
          color: var(--ha-color-on-neutral-normal);
        }

        :host([variant="danger"]) #icon ::slotted(*) {
          color: var(--ha-color-on-danger-quiet);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown-item": HaDropdownItem;
  }
}
