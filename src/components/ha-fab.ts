import type { Fab } from "@material/mwc-fab";
import "@material/mwc-fab";
import { customElement } from "lit-element";
import { Constructor } from "../types";

const MwcFab = customElements.get("mwc-fab") as Constructor<Fab>;

@customElement("ha-fab")
export class HaFab extends MwcFab {
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
