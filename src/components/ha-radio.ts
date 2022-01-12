import { Radio } from "@material/mwc-radio";
import { customElement } from "lit/decorators";

@customElement("ha-radio")
export class HaRadio extends Radio {
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
