import Dropdown from "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import type { CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-dropdown")
export class HaDropdown extends Dropdown {
  @property({ attribute: false }) dropdownTag = "ha-dropdown";

  @property({ attribute: false }) dropdownItemTag = "ha-dropdown-item";

  static get styles(): CSSResultGroup {
    return [Dropdown.styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown": HaDropdown;
  }
}
