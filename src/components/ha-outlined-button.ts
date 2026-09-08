import { OutlinedButton } from "@material/web/button/internal/outlined-button";
import { styles as sharedStyles } from "@material/web/button/internal/shared-styles.cssresult.js";
import { styles } from "@material/web/button/internal/outlined-styles.cssresult.js";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-outlined-button")
export class HaOutlinedButton extends OutlinedButton {
  static override styles = [
    sharedStyles,
    styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-outline: var(--outline-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-button": HaOutlinedButton;
  }
}
