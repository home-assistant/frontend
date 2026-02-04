import Dropdown from "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaDropdownItem } from "./ha-dropdown-item";

export type HaDropdownSelectEvent = CustomEvent<{ item: HaDropdownItem }>;

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
export class HaDropdown extends Dropdown {
  @property({ attribute: false }) dropdownTag = "ha-dropdown";

  @property({ attribute: false }) dropdownItemTag = "ha-dropdown-item";

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
