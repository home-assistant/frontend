import { css } from "lit";
import { customElement } from "lit/decorators";

import { styles } from "@material/web/button/lib/outlined-styles.css";
import { styles as sharedStyles } from "@material/web/button/lib/shared-styles.css";
import { MdOutlinedButton } from "@material/web/button/outlined-button";

@customElement("ha-outlined-button")
export class HaOutlinedButton extends MdOutlinedButton {
  static override styles = [
    sharedStyles,
    styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-outline: var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-button": HaOutlinedButton;
  }
}
