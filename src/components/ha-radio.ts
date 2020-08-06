import "@material/mwc-radio";
import type { Radio } from "@material/mwc-radio";
import { customElement } from "lit-element";
import type { Constructor } from "../types";

const MwcRadio = customElements.get("mwc-radio") as Constructor<Radio>;

@customElement("ha-radio")
export class HaRadio extends MwcRadio {
  public firstUpdated() {
    super.firstUpdated();
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio": HaRadio;
  }
}
