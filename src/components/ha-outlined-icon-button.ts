import { css } from "lit";
import { customElement } from "lit/decorators";

import { IconButton } from "@material/web/iconbutton/lib/icon-button";
import { styles as outlinedStyles } from "@material/web/iconbutton/lib/outlined-styles.css";
import { styles as sharedStyles } from "@material/web/iconbutton/lib/shared-styles.css";

@customElement("ha-outlined-icon-button")
export class HaOutlinedIconButton extends IconButton {
  protected override getRenderClasses() {
    return {
      ...super.getRenderClasses(),
      outlined: true,
    };
  }

  static override styles = [
    sharedStyles,
    outlinedStyles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-on-surface: var(--secondary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-sys-color-on-surface-rgb: var(--rgb-secondary-text-color);
      }
      button {
        /* Fix md-outlined-icon-button padding for iOS */
        padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-icon-button": HaOutlinedIconButton;
  }
}
