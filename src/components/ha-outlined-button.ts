import { css } from "lit";
import { customElement } from "lit/decorators";
import { OutlinedButton } from "@material/web/button/lib/outlined-button";
import { styles as outlinedStyles } from "@material/web/button/lib/outlined-styles.css";
import { styles as sharedStyles } from "@material/web/button/lib/shared-styles.css";

@customElement("ha-outlined-button")
export class HaOutlinedButton extends OutlinedButton {
  static override styles = [
    sharedStyles,
    outlinedStyles,
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
