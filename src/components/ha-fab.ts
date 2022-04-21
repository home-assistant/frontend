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
      :host-context([style*="direction: rtl;"])
        .mdc-fab--extended
        .mdc-fab__icon {
        margin-left: 12px !important;
        margin-right: calc(12px - 20px) !important;
      }
    `,
  ]);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
