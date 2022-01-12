import { Fab } from "@material/mwc-fab";
import { customElement } from "lit/decorators";

@customElement("ha-fab")
export class HaFab extends Fab {
  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
