import DropdownItem from "@home-assistant/webawesome/dist/components/dropdown-item/dropdown-item";
import type { CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-dropdown-item")
export class HaDropdownItem extends DropdownItem {
  static get styles(): CSSResultGroup {
    return [DropdownItem.styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown-item": HaDropdownItem;
  }
}
