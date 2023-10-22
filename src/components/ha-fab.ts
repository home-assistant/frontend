import { Fab } from "@material/mwc-fab";
import { customElement } from "lit/decorators";
import { css } from "lit";

@customElement("ha-fab")
export class HaFab extends Fab {
  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }

  static override styles = [
    ...super.styles,
    css`
      :host .mdc-fab--extended .mdc-fab__icon {
        margin-inline-start: -8px;
        margin-inline-end: 12px;
        direction: var(--direction);
      }
    `,
    // safari workaround - must be explicit
    document.dir === "rtl"
      ? css`
          :host .mdc-fab--extended .mdc-fab__icon {
            direction: rtl;
          }
        `
      : css``,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
