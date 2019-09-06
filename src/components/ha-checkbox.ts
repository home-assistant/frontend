import { Constructor, customElement } from "lit-element";
import "@material/mwc-checkbox";
// tslint:disable-next-line
import { Checkbox } from "@material/mwc-checkbox";
// tslint:disable-next-line
const MwcCheckbox = customElements.get("mwc-checkbox") as Constructor<Checkbox>;

@customElement("ha-checkbox")
export class HaCheckbox extends MwcCheckbox {
  protected firstUpdated() {
    super.firstUpdated();
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-checkbox": HaCheckbox;
  }
}
