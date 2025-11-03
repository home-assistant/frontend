import Dropdown from "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";

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
          --wa-color-surface-border: var(--ha-color-border-normal);
          --wa-color-surface-raised: var(
            --card-background-color,
            var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff)),
          );
        }

        #menu {
          --wa-shadow-m: 0px 4px 8px 0px var(--ha-color-shadow);
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
