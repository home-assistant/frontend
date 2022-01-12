import { Checkbox } from "@material/mwc-checkbox";
import { customElement } from "lit/decorators";

@customElement("ha-checkbox")
export class HaCheckbox extends Checkbox {
  public firstUpdated() {
    super.firstUpdated();
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-checkbox": HaCheckbox;
  }
}
