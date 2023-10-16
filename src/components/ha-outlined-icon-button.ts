import { css } from "lit";
import { customElement } from "lit/decorators";
import { MdOutlinedIconButton } from "@material/web/iconbutton/outlined-icon-button";

@customElement("ha-outlined-icon-button")
export class HaOutlinedIconButton extends MdOutlinedIconButton {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-on-surface: var(--secondary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-sys-color-on-surface-rgb: var(--rgb-secondary-text-color);
        --md-sys-color-outline: var(--secondary-text-color);
      }
      :host([no-ripple]) .outlined {
        --md-ripple-focus-opacity: 0;
        --md-ripple-hover-opacity: 0;
        --md-ripple-pressed-opacity: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-icon-button": HaOutlinedIconButton;
  }
}
