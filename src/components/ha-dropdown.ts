import Dropdown from "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import type { CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-dropdown")
export class HaDropdown extends Dropdown {
  static get styles(): CSSResultGroup {
    return [Dropdown.styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown": HaDropdown;
  }
}
