import { MdFabExtended } from "@material/web/fab/fab-extended";
import { customElement } from "lit/decorators";
import { css } from "lit";

@customElement("ha-fab")
export class HaFab extends MdFabExtended {
  static override styles = [
    ...MdFabExtended.styles,
    css`
      :host {
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-primary: var(--primary-color);
      }
      .md3-fab {
        padding-inline-end: 16px;
      }
      .md3-fab__label {
        padding-inline-end: 4px;
      }
      .md3-fab__label:empty {
        padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
