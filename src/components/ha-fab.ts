import { Fab } from "@material/mwc-fab";
import { customElement } from "lit/decorators";
import { css } from "lit";

@customElement("ha-fab")
export class HaFab extends Fab {
  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }

  static override styles = Fab.styles.concat([
    css`
      .mdc-fab--extended .mdc-fab__icon {
        margin-left: var(--rtl-12px, -8px) !important;
        margin-right: var(--rtl--8px, 12px) !important;
      }
    `,
  ]);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
