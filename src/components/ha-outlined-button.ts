import { css } from "lit";
import { customElement } from "lit/decorators";
import { MdOutlinedButton } from "@material/web/button/outlined-button";

@customElement("ha-outlined-button")
export class HaOutlinedButton extends MdOutlinedButton {
  static override styles = [
    ...super.styles,
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
