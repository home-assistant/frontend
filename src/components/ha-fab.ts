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
        margin-inline-start: -8px !important;
        margin-inline-end: 12px !important;
        direction: var(--direction) !important;
      }
    `,
  ]);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
