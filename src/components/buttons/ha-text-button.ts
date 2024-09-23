import { MdTextButton } from "@material/web/button/text-button";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-text-button")
export class HaTextButton extends MdTextButton {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);

        .label {
          letter-spacing: 0.0892857143em;
          text-transform: uppercase;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-text-button": HaTextButton;
  }
}
