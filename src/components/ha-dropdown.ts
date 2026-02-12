import type WaButton from "@home-assistant/webawesome/dist/components/button/button";
import Dropdown from "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaDropdownItem } from "./ha-dropdown-item";

/**
 * Event type for the ha-dropdown component when an item is selected.
 * @param T - The type of the value of the selected item.
 */
export type HaDropdownSelectEvent<T = string> = CustomEvent<{
  item: Omit<HaDropdownItem, "value"> & { value: T };
}>;

/**
 * Home Assistant dropdown component
 *
 * @element ha-dropdown
 * @extends {Dropdown}
 *
 * @summary
 * A stylable dropdown component supporting Home Assistant theming, variants, and appearances based on webawesome dropdown.
 *
 */
@customElement("ha-dropdown")
// @ts-ignore Allow to set an alternative anchor element
export class HaDropdown extends Dropdown {
  @property({ attribute: false }) dropdownTag = "ha-dropdown";

  @property({ attribute: false }) dropdownItemTag = "ha-dropdown-item";

  public get anchorElement(): HTMLButtonElement | WaButton | undefined {
    // @ts-ignore Allow to set an anchor element on popup
    return this.popup?.anchor as HTMLButtonElement | WaButton | undefined;
  }

  public set anchorElement(element: HTMLButtonElement | WaButton | undefined) {
    // @ts-ignore Allow to get the current anchor element from popup
    if (!this.popup) {
      return;
    }
    // @ts-ignore Allow to get the current anchor element from popup
    this.popup.anchor = element;
  }

  /** Get the slotted trigger button, a <wa-button> or <button> element */
  // @ts-ignore Override parent method to be able to use alternative anchor
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private override getTrigger(): HTMLButtonElement | WaButton | null {
    if (this.anchorElement) {
      return this.anchorElement;
    }
    // @ts-ignore fallback to default trigger slot if no anchorElement is set
    return super.getTrigger();
  }

  static get styles(): CSSResultGroup {
    return [
      Dropdown.styles,
      css`
        :host {
          font-size: var(--ha-dropdown-font-size, var(--ha-font-size-m));
          --wa-color-surface-raised: var(
            --card-background-color,
            var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff)),
          );
        }

        #menu {
          padding: var(--ha-space-1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown": HaDropdown;
  }
}
