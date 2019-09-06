import { customElement } from "lit-element";
import "@material/mwc-checkbox";

// tslint:disable-next-line
const MwcCheckbox = customElements.get("mwc-checkbox");

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
