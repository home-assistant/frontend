import { IconButton } from "@material/web/iconbutton/internal/icon-button";
import { styles } from "@material/web/iconbutton/internal/outlined-styles";
import { styles as sharedStyles } from "@material/web/iconbutton/internal/shared-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-outlined-icon-button")
export class HaOutlinedIconButton extends IconButton {
  protected override getRenderClasses() {
    return {
      ...super.getRenderClasses(),
      outlined: true,
    };
  }

  static override styles = [
    css`
      .icon-button {
        border-radius: var(--_container-shape);
      }
    `,
    sharedStyles,
    styles,
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
